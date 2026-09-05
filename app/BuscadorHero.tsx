'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ResultadoJugador = { slug: string; nombre_mostrado: string; posicion_general: string | null };
type ResultadoPartido = { slug: string; fecha: string; rival: string; local: boolean };

const CORDOBA_ID = 74;

export default function BuscadorHero({
  sugerencias,
}: {
  sugerencias: { label: string; href: string }[];
}) {
  const [tab, setTab] = useState<'jugadores' | 'partidos'>('jugadores');
  const [query, setQuery] = useState('');
  const [jugadores, setJugadores] = useState<ResultadoJugador[]>([]);
  const [partidos, setPartidos] = useState<ResultadoPartido[]>([]);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setJugadores([]);
      setPartidos([]);
      return;
    }
    const timeout = setTimeout(async () => {
      if (tab === 'jugadores') {
        const { data } = await supabase
          .from('personas')
          .select('slug, nombre_mostrado, posicion_general')
          .ilike('nombre_mostrado', `%${q}%`)
          .limit(6);
        setJugadores(data ?? []);
      } else {
        const { data: equiposCoincidentes } = await supabase
          .from('equipos')
          .select('id, nombre_corto')
          .ilike('nombre_corto', `%${q}%`)
          .limit(10);
        const idsRivales = (equiposCoincidentes ?? []).map((e: any) => e.id);

        let filtro = supabase
          .from('partidos')
          .select(
            `slug, fecha, equipo_local_id, equipo_visitante_id,
             equipo_local:equipos!partidos_equipo_local_id_fkey(nombre_corto),
             equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(nombre_corto)`
          )
          .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`);

        if (idsRivales.length > 0) {
          filtro = filtro.or(
            idsRivales.map((id: number) => `equipo_local_id.eq.${id},equipo_visitante_id.eq.${id}`).join(',')
          );
        } else if (/^\d{4}$/.test(q) || /^\d{4}-\d{2,4}$/.test(q)) {
          filtro = filtro.gte('fecha', `${q.slice(0, 4)}-01-01`).lte('fecha', `${q.slice(0, 4)}-12-31`);
        } else {
          setPartidos([]);
          return;
        }

        const { data } = await filtro.order('fecha', { ascending: false }).limit(8);
        setPartidos(
          (data ?? []).map((p: any) => {
            const local = p.equipo_local_id === CORDOBA_ID;
            const rival = local ? p.equipo_visitante.nombre_corto : p.equipo_local.nombre_corto;
            return { slug: p.slug, fecha: p.fecha, rival, local };
          })
        );
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, tab]);

  return (
    <div ref={contenedorRef} className="relative max-w-xl mx-auto">
      <div className="flex justify-center gap-6 mb-3 text-sm">
        <button
          onClick={() => {
            setTab('jugadores');
            setQuery('');
          }}
          className={`pb-1 border-b-2 ${tab === 'jugadores' ? 'border-blanquiverde-verde text-blanquiverde-verde font-semibold' : 'border-transparent text-gray-400'}`}
        >
          Jugadores
        </button>
        <button
          onClick={() => {
            setTab('partidos');
            setQuery('');
          }}
          className={`pb-1 border-b-2 ${tab === 'partidos' ? 'border-blanquiverde-verde text-blanquiverde-verde font-semibold' : 'border-transparent text-gray-400'}`}
        >
          Partidos
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setAbierto(true)}
        placeholder={tab === 'jugadores' ? 'Busca un jugador por nombre...' : 'Busca por rival o año...'}
        className="w-full border-2 border-blanquiverde-verde rounded-full px-6 py-3 text-lg focus:outline-none"
      />

      {abierto && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-2 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
          {tab === 'jugadores' &&
            (jugadores.length > 0 ? (
              jugadores.map((j) => (
                <Link
                  key={j.slug}
                  href={`/jugadores/${j.slug}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  <span>{j.nombre_mostrado}</span>
                  {j.posicion_general && <span className="text-gray-400 text-xs">{j.posicion_general}</span>}
                </Link>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-gray-400">Sin resultados.</p>
            ))}
          {tab === 'partidos' &&
            (partidos.length > 0 ? (
              partidos.map((p) => (
                <Link key={p.slug} href={`/partidos/${p.slug}`} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm">
                  <span>
                    {p.local ? 'Córdoba' : p.rival} vs {p.local ? p.rival : 'Córdoba'}
                  </span>
                  <span className="text-gray-400 text-xs">{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                </Link>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-gray-400">Sin resultados.</p>
            ))}
        </div>
      )}

      {sugerencias.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-4 text-sm text-gray-500">
          {sugerencias.map((s, i) => (
            <span key={s.href}>
              <Link href={s.href} className="hover:underline hover:text-blanquiverde-verde">
                {s.label}
              </Link>
              {i < sugerencias.length - 1 && <span className="mx-2 text-gray-300">·</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
