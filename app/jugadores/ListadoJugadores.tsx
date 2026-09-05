'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type Jugador = {
  id: number;
  nombre_mostrado: string;
  slug: string;
  posicion_general: string | null;
  posicion_especifica: string | null;
  partidos: number;
  titularidades: number;
  goles: number;
  golesEncajados: number;
};

export default function ListadoJugadores({ jugadores }: { jugadores: Jugador[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [posicion, setPosicion] = useState('');

  function posicionMostrada(j: Jugador) {
    if (!j.posicion_especifica) return j.posicion_general ?? '—';
    if (j.posicion_especifica.toLowerCase().includes('sin especificar')) return j.posicion_general ?? '—';
    return j.posicion_especifica;
  }

  const filtrados = useMemo(() => {
    return jugadores.filter((j) => {
      const coincideNombre = j.nombre_mostrado.toLowerCase().includes(busqueda.toLowerCase());
      const coincidePosicion = !posicion || j.posicion_general === posicion;
      return coincideNombre && coincidePosicion;
    });
  }, [jugadores, busqueda, posicion]);

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border rounded-lg px-4 py-2 flex-1"
        />
        <select value={posicion} onChange={(e) => setPosicion(e.target.value)} className="border rounded-lg px-4 py-2">
          <option value="">Todas las posiciones</option>
          <option value="Portero">Portero</option>
          <option value="Defensa">Defensa</option>
          <option value="Centrocampista">Centrocampista</option>
          <option value="Delantero">Delantero</option>
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-3">{filtrados.length} jugadores</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Jugador</th>
              <th className="py-2 pr-4">Posición</th>
              <th className="py-2 pr-4 text-center">Partidos</th>
              <th className="py-2 pr-4 text-center">Titular</th>
              <th className="py-2 pr-4 text-center">Goles</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((j, i) => (
              <tr key={j.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                <td className="py-2 pr-4">
                  <Link href={`/jugadores/${j.slug}`} className="hover:underline font-medium">
                    {j.nombre_mostrado}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-gray-500">{posicionMostrada(j)}</td>
                <td className="py-2 pr-4 text-center">{j.partidos}</td>
                <td className="py-2 pr-4 text-center">{j.titularidades}</td>
                <td className="py-2 pr-4 text-center">
                  {j.posicion_general === 'Portero'
                    ? j.golesEncajados > 0
                      ? `(${j.golesEncajados})`
                      : ''
                    : j.goles > 0
                      ? j.goles
                      : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        En porteros, el número entre paréntesis en "Goles" son goles encajados, no marcados.
      </p>
    </div>
  );
}
