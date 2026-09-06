// @ts-nocheck
import { getJugadorBySlug } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SeasonTable from './SeasonTable';
import GoalsList from './GoalsList';

const CORDOBA_ID = 74;

function edadEn(fechaNacimiento: string | null, fechaReferencia: Date) {
  if (!fechaNacimiento) return null;
  const inicio = new Date(fechaNacimiento);
  let a = fechaReferencia.getFullYear() - inicio.getFullYear();
  const m = fechaReferencia.getMonth() - inicio.getMonth();
  if (m < 0 || (m === 0 && fechaReferencia.getDate() < inicio.getDate())) a--;
  return a;
}

function nombreCompleto(persona: any) {
  const partes = [persona.nombre, persona.apellido1, persona.apellido2].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : null;
}

function fechaCorta(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: persona } = await supabase
    .from('personas')
    .select('nombre_mostrado, posicion_general, posicion_especifica')
    .eq('slug', params.slug)
    .single();
  if (!persona) return { title: 'Jugador no encontrado · Archivo Blanquiverde' };
  const posicion = persona.posicion_especifica || persona.posicion_general || '';
  return {
    title: `${persona.nombre_mostrado} · Archivo Blanquiverde`,
    description: `Estadísticas, partidos y goles de ${persona.nombre_mostrado}${posicion ? ` (${posicion})` : ''} con el Córdoba CF.`,
  };
}

export default async function JugadorPage({ params }: { params: { slug: string } }) {
  const data = await getJugadorBySlug(params.slug);
  if (!data) return notFound();

  const { persona, convocatorias, goles, tarjetas, companeros, entrenadores, rankingPartidos, rankingGoles, esTambienEntrenador } = data;

  const jugados = convocatorias.filter((c: any) => c.jugo && c.partido);

  // Hat-tricks: agrupamos los goles ya cargados por partido (sin consulta extra).
  const golesPorPartido = new Map<string, { count: number; partido: any }>();
  for (const g of goles as any[]) {
    if (!g.partido) continue;
    const actual = golesPorPartido.get(g.partido.slug) ?? { count: 0, partido: g.partido };
    actual.count += 1;
    golesPorPartido.set(g.partido.slug, actual);
  }
  const hattricks = Array.from(golesPorPartido.values())
    .filter((h) => h.count >= 3)
    .sort((a, b) => b.count - a.count || new Date(b.partido.fecha).getTime() - new Date(a.partido.fecha).getTime());


  // --- Agrupación temporada -> competición (para la tabla de temporadas) ---
  type Comp = { competicion: string; pj: number; titular: number; goles: number; tarjetas: number };
  type Temp = { temporada: string; anioInicio: number; comps: Map<string, Comp>; dorsal: number | null; ultimaFechaDorsal: string | null };
  const temporadas = new Map<string, Temp>();

  function getTemp(etiqueta: string, anioInicio: number) {
    let t = temporadas.get(etiqueta);
    if (!t) {
      t = { temporada: etiqueta, anioInicio, comps: new Map(), dorsal: null, ultimaFechaDorsal: null };
      temporadas.set(etiqueta, t);
    }
    return t;
  }
  function getComp(t: Temp, nombreComp: string) {
    let c = t.comps.get(nombreComp);
    if (!c) {
      c = { competicion: nombreComp, pj: 0, titular: 0, goles: 0, tarjetas: 0 };
      t.comps.set(nombreComp, c);
    }
    return c;
  }

  let victorias = 0,
    empates = 0,
    derrotas = 0;

  // Rivales: partidos por equipo contrario
  const rivales = new Map<number, { nombre: string; partidos: number }>();

  for (const c of jugados) {
    const etiqueta = c.partido?.edicion?.temporada?.etiqueta ?? '?';
    const anioInicio = parseInt(etiqueta.split('-')[0], 10) || 0;
    const nombreComp = c.partido?.edicion?.competicion?.nombre_actual ?? 'Otra';
    const t = getTemp(etiqueta, anioInicio);
    const comp = getComp(t, nombreComp);
    comp.pj += 1;
    if (c.participacion?.titular) comp.titular += 1;

    const p = c.partido;
    if (c.dorsal != null && p?.fecha && (!t.ultimaFechaDorsal || p.fecha >= t.ultimaFechaDorsal)) {
      t.dorsal = c.dorsal;
      t.ultimaFechaDorsal = p.fecha;
    }
    if (p && p.equipo_local && p.equipo_visitante && p.goles_local != null && p.goles_visitante != null) {
      const cordobaEsLocal = p.equipo_local.id === CORDOBA_ID;
      const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
      const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;
      if (golesCordoba > golesRival) victorias += 1;
      else if (golesCordoba === golesRival) empates += 1;
      else derrotas += 1;

      const rival = cordobaEsLocal ? p.equipo_visitante : p.equipo_local;
      if (rival) {
        const actual = rivales.get(rival.id) ?? { nombre: rival.nombre_corto, partidos: 0 };
        actual.partidos += 1;
        rivales.set(rival.id, actual);
      }
    }
  }
  for (const g of goles) {
    const etiqueta = g.partido?.edicion?.temporada?.etiqueta ?? '?';
    const anioInicio = parseInt(etiqueta.split('-')[0], 10) || 0;
    const nombreComp = g.partido?.edicion?.competicion?.nombre_actual ?? 'Otra';
    const t = getTemp(etiqueta, anioInicio);
    const comp = getComp(t, nombreComp);
    comp.goles += 1;
  }
  for (const tj of tarjetas) {
    const etiqueta = tj.partido?.edicion?.temporada?.etiqueta ?? '?';
    const anioInicio = parseInt(etiqueta.split('-')[0], 10) || 0;
    const nombreComp = tj.partido?.edicion?.competicion?.nombre_actual ?? 'Otra';
    const t = getTemp(etiqueta, anioInicio);
    const comp = getComp(t, nombreComp);
    comp.tarjetas += 1;
  }

  const filasTemporada = Array.from(temporadas.values())
    .sort((a, b) => a.anioInicio - b.anioInicio)
    .map((t) => {
      const comps = Array.from(t.comps.values()).sort((a, b) => b.pj - a.pj);
      const pj = comps.reduce((s, c) => s + c.pj, 0);
      const titular = comps.reduce((s, c) => s + c.titular, 0);
      const golesT = comps.reduce((s, c) => s + c.goles, 0);
      const tarjetasT = comps.reduce((s, c) => s + c.tarjetas, 0);
      const edad = edadEn(persona.fecha_nacimiento, new Date(t.anioInicio, 6, 1));
      return { temporada: t.temporada, dorsal: t.dorsal, edad, pj, titular, goles: golesT, tarjetas: tarjetasT, competiciones: comps };
    });

  const topRivales = Array.from(rivales.values())
    .sort((a, b) => b.partidos - a.partidos)
    .slice(0, 5);

  const totalPartidos = jugados.length;
  const totalGoles = goles.length;
  const totalTemporadas = filasTemporada.length;
  const totalDecididos = victorias + empates + derrotas;
  const pct = (n: number) => (totalDecididos > 0 ? ((n / totalDecididos) * 100).toFixed(1) : '0.0');

  const nombreLargo = nombreCompleto(persona);

  // Debut y último partido, ordenados por fecha
  const porFecha = [...jugados].sort((a: any, b: any) => new Date(a.partido.fecha).getTime() - new Date(b.partido.fecha).getTime());
  const debut = porFecha[0];
  const ultimo = porFecha[porFecha.length - 1];

  function ResultadoPartido({ c }: { c: any }) {
    const p = c.partido;
    return (
      <Link href={`/partidos/${p.slug}`} className="hover:underline">
        {p.equipo_local.nombre_corto} {p.goles_local}-{p.goles_visitante} {p.equipo_visitante.nombre_corto}
      </Link>
    );
  }

  // Lista completa de goles, ordenada cronológicamente, para el desplegable
  const golesOrdenados = [...goles]
    .filter((g: any) => g.partido)
    .sort((a: any, b: any) => new Date(a.partido.fecha).getTime() - new Date(b.partido.fecha).getTime())
    .map((g: any) => {
      const p = g.partido;
      const cordobaEsLocal = p.equipo_local?.id === CORDOBA_ID;
      const rival = cordobaEsLocal ? p.equipo_visitante : p.equipo_local;
      return {
        fecha: p.fecha,
        slug: p.slug,
        rival: rival?.nombre_corto ?? '?',
        minuto: g.minuto,
        minutoExtra: g.minuto_extra,
        tipo: g.tipo,
        temporada: p.edicion?.temporada?.etiqueta ?? '?',
      };
    });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col items-center text-center pt-4 pb-8">
        {persona.foto_url ? (
          <img
            src={persona.foto_url}
            alt={persona.nombre_mostrado}
            className="w-40 h-40 rounded-full object-cover border-2 border-blanquiverde-verde"
          />
        ) : (
          <div className="w-40 h-40 rounded-full bg-gray-100 border-2 border-blanquiverde-verde flex items-center justify-center text-5xl text-gray-300 font-serif">
            {persona.nombre_mostrado?.[0] ?? '?'}
          </div>
        )}

        <h1 className="font-serif text-5xl font-bold tracking-wide text-blanquiverde-verde mt-6 uppercase">
          {persona.nombre_mostrado}
        </h1>

        <div className="mt-4 text-sm space-y-1 font-serif">
          {nombreLargo && (
            <p>
              <span className="font-bold">Nombre completo:</span> {nombreLargo}
            </p>
          )}
          {persona.fecha_nacimiento && (
            <p>
              <span className="font-bold">Fecha de nacimiento:</span> {fechaCorta(persona.fecha_nacimiento)}
              {persona.fecha_fallecimiento && <> — falleció el {fechaCorta(persona.fecha_fallecimiento)}</>}
            </p>
          )}
          {persona.lugar_nacimiento && (
            <p>
              <span className="font-bold">Lugar de nacimiento:</span> {persona.lugar_nacimiento}
            </p>
          )}
        </div>

        {esTambienEntrenador && (
          <Link href={`/entrenadores/${persona.slug}`} className="mt-4 text-sm text-blanquiverde-verde hover:underline">
            También entrenó al Córdoba CF →
          </Link>
        )}
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-serif">Temporadas</div>
          <div className="text-4xl font-bold font-serif text-blanquiverde-verde mt-1">{totalTemporadas}</div>
        </div>
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-serif">Partidos</div>
          <div className="text-4xl font-bold font-serif text-blanquiverde-verde mt-1">{totalPartidos}</div>
          {rankingPartidos && <div className="text-xs text-gray-400 mt-1">#{rankingPartidos} en la historia</div>}
        </div>
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-serif">Goles</div>
          <div className="text-4xl font-bold font-serif text-blanquiverde-verde mt-1">{totalGoles}</div>
          {rankingGoles && <div className="text-xs text-gray-400 mt-1">#{rankingGoles} en la historia</div>}
        </div>
      </div>

      {/* V/E/D — número primero, porcentaje debajo */}
      {totalDecididos > 0 && (
        <div className="border rounded-lg grid grid-cols-3 divide-x mb-8 py-4 text-center font-serif">
          <div>
            <div className="text-xs uppercase text-gray-500">Victorias</div>
            <div className="text-2xl font-bold text-blanquiverde-verde">{victorias}</div>
            <div className="text-xs text-gray-400">({pct(victorias)}%)</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Empates</div>
            <div className="text-2xl font-bold text-blanquiverde-verde">{empates}</div>
            <div className="text-xs text-gray-400">({pct(empates)}%)</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Derrotas</div>
            <div className="text-2xl font-bold text-blanquiverde-verde">{derrotas}</div>
            <div className="text-xs text-gray-400">({pct(derrotas)}%)</div>
          </div>
        </div>
      )}

      {/* Debut y último partido — con protagonismo propio */}
      {(debut || ultimo) && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {debut && (
            <div className="border-2 border-blanquiverde-verde rounded-lg p-4 text-center font-serif">
              <div className="text-xs uppercase tracking-wide text-gray-500">Debut</div>
              <div className="text-sm text-gray-500 mt-1">{fechaCorta(debut.partido.fecha)}</div>
              <div className="mt-1 font-semibold">
                <ResultadoPartido c={debut} />
              </div>
            </div>
          )}
          {ultimo && (
            <div className="border-2 border-blanquiverde-verde rounded-lg p-4 text-center font-serif">
              <div className="text-xs uppercase tracking-wide text-gray-500">Último partido</div>
              <div className="text-sm text-gray-500 mt-1">{fechaCorta(ultimo.partido.fecha)}</div>
              <div className="mt-1 font-semibold">
                <ResultadoPartido c={ultimo} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resumen por temporadas */}
      <div className="mb-6">
        <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">📊 Resumen por temporadas</h2>
        <p className="sm:hidden text-xs text-gray-400 mb-1">Desliza para ver toda la tabla →</p>
        <div className="overflow-x-auto border border-blanquiverde-verde/40 rounded-lg">
          <SeasonTable filas={filasTemporada} />
        </div>
        <p className="text-xs text-gray-400 text-center mt-3 font-serif">Los datos pueden estar sujetos a revisión.</p>
      </div>

      {/* Hat-tricks */}
      {hattricks.length > 0 && (
        <div className="border border-blanquiverde-verde/40 rounded-lg p-6 mb-8 bg-blanquiverde-verde/5">
          <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">
            🎩 {hattricks.length === 1 ? 'Hat-trick' : `${hattricks.length} hat-tricks`}
          </h2>
          <ul className="space-y-2 text-sm">
            {hattricks.map((h) => (
              <li key={h.partido.slug} className="flex items-center justify-between gap-3">
                <ResultadoPartido c={{ partido: h.partido }} />
                <span className="text-gray-400 whitespace-nowrap">{h.count} goles</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Goles — lista completa desplegable */}
      {golesOrdenados.length > 0 && (
        <div className="border rounded-lg p-6 mb-8">
          <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">⚽ Goles ({golesOrdenados.length})</h2>
          <GoalsList goles={golesOrdenados} />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {/* Compañeros */}
        <div className="border rounded-lg p-6">
          <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">Compañeros</h2>
          {companeros.length === 0 && <p className="text-gray-400 text-sm">Sin datos.</p>}
          <ol className="space-y-1.5 text-sm">
            {companeros.map((c: any) => (
              <li key={c.persona_id} className="flex justify-between">
                <Link href={`/jugadores/${c.slug}`} className="hover:underline">
                  {c.nombre_mostrado}
                </Link>
                <span className="text-gray-500">{c.partidos}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Rivales */}
        <div className="border rounded-lg p-6">
          <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">Rivales</h2>
          {topRivales.length === 0 && <p className="text-gray-400 text-sm">Sin datos.</p>}
          <ol className="space-y-1.5 text-sm">
            {topRivales.map((r) => (
              <li key={r.nombre} className="flex justify-between">
                <span>{r.nombre}</span>
                <span className="text-gray-500">{r.partidos}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Entrenadores */}
        <div className="border rounded-lg p-6">
          <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">Entrenadores</h2>
          {entrenadores.length === 0 && <p className="text-gray-400 text-sm">Sin datos.</p>}
          <ol className="space-y-1.5 text-sm">
            {entrenadores.map((e: any) => (
              <li key={e.persona_id} className="flex justify-between">
                <Link href={`/entrenadores/${e.slug}`} className="hover:underline">
                  {e.nombre_mostrado}
                </Link>
                <span className="text-gray-500">{e.partidos}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
