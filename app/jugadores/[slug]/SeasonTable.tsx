'use client';

import { useState } from 'react';
import Link from 'next/link';

type CompeticionFila = {
  competicion: string;
  pj: number;
  titular: number;
  goles: number;
  tarjetas: number;
};

type TemporadaFila = {
  temporada: string;
  edad: number | null;
  pj: number;
  titular: number;
  goles: number;
  tarjetas: number;
  competiciones: CompeticionFila[];
};

export default function SeasonTable({ filas }: { filas: TemporadaFila[] }) {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  function toggle(temporada: string) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(temporada)) next.delete(temporada);
      else next.add(temporada);
      return next;
    });
  }

  return (
    <table className="w-full text-sm min-w-[600px]">
      <thead>
        <tr className="text-left text-gray-500 border-b-2 border-gray-800 font-serif">
          <th className="py-2 pr-4">Temporada</th>
          <th className="py-2 pr-4">Edad</th>
          <th className="py-2 pr-4 text-center">Partidos</th>
          <th className="py-2 pr-4 text-center">Titular</th>
          <th className="py-2 pr-4 text-center">Goles</th>
          <th className="py-2 pr-4 text-center">Tarjetas</th>
          <th className="py-2 pr-2 w-8"></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => {
          const puedeExpandir = f.competiciones.length > 1;
          const abierta = abiertas.has(f.temporada);
          return (
            <>
              <tr
                key={f.temporada}
                className={`border-b last:border-0 font-serif ${puedeExpandir ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => puedeExpandir && toggle(f.temporada)}
              >
                <td className="py-2 pr-4">
                  <Link
                    href={`/temporadas/${f.temporada}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {f.temporada}
                  </Link>
                </td>
                <td className="py-2 pr-4">{f.edad ?? '—'}</td>
                <td className="py-2 pr-4 text-center">{f.pj}</td>
                <td className="py-2 pr-4 text-center">{f.titular}</td>
                <td className="py-2 pr-4 text-center">{f.goles > 0 ? f.goles : ''}</td>
                <td className="py-2 pr-4 text-center">{f.tarjetas > 0 ? f.tarjetas : ''}</td>
                <td className="py-2 pr-2 text-center text-gray-400">{puedeExpandir ? (abierta ? '−' : '+') : ''}</td>
              </tr>
              {abierta &&
                f.competiciones.map((c) => (
                  <tr key={f.temporada + c.competicion} className="border-b last:border-0 text-gray-500 bg-gray-50 text-xs">
                    <td className="py-1.5 pr-4 pl-6">{c.competicion}</td>
                    <td className="py-1.5 pr-4"></td>
                    <td className="py-1.5 pr-4 text-center">{c.pj}</td>
                    <td className="py-1.5 pr-4 text-center">{c.titular}</td>
                    <td className="py-1.5 pr-4 text-center">{c.goles > 0 ? c.goles : ''}</td>
                    <td className="py-1.5 pr-4 text-center">{c.tarjetas > 0 ? c.tarjetas : ''}</td>
                    <td></td>
                  </tr>
                ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}
