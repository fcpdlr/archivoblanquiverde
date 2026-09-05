'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type Entrenador = {
  id: number;
  nombre_mostrado: string;
  slug: string;
  partidos: number;
  v: number;
  e: number;
  d: number;
  pctV: number;
  mejorRachaVictorias: number;
  mejorRachaInvicto: number;
};

type Columna = 'partidos' | 'v' | 'e' | 'd' | 'pctV' | 'mejorRachaVictorias' | 'mejorRachaInvicto';

const COLUMNAS: { key: Columna; label: string }[] = [
  { key: 'partidos', label: 'PJ' },
  { key: 'v', label: 'V' },
  { key: 'e', label: 'E' },
  { key: 'd', label: 'D' },
  { key: 'pctV', label: '%V' },
  { key: 'mejorRachaVictorias', label: 'Mejor racha V' },
  { key: 'mejorRachaInvicto', label: 'Mejor racha invicto' },
];

export default function ComparadorEntrenadores({ entrenadores }: { entrenadores: Entrenador[] }) {
  const [orden, setOrden] = useState<Columna>('partidos');
  const [asc, setAsc] = useState(false);

  const ordenados = useMemo(() => {
    return [...entrenadores].sort((a, b) => (asc ? a[orden] - b[orden] : b[orden] - a[orden]));
  }, [entrenadores, orden, asc]);

  function cambiarOrden(col: Columna) {
    if (col === orden) setAsc((v) => !v);
    else {
      setOrden(col);
      setAsc(false);
    }
  }

  function Cabecera({ col, label }: { col: Columna; label: string }) {
    const activa = orden === col;
    return (
      <th
        className={`py-2 px-3 text-center cursor-pointer select-none whitespace-nowrap ${activa ? 'text-white font-bold underline decoration-2 underline-offset-2' : ''}`}
        onClick={() => cambiarOrden(col)}
      >
        {label}
        {activa && <span className="ml-0.5">{asc ? '↑' : '↓'}</span>}
      </th>
    );
  }

  return (
    <>
      <p className="sm:hidden text-xs text-gray-400 mb-1">Desliza para ver toda la tabla →</p>
      <div className="overflow-x-auto border border-blanquiverde-verde/40 rounded-lg">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="text-left text-white text-xs uppercase bg-blanquiverde-verde">
            <th className="py-2 px-4">#</th>
            <th className="py-2 px-4">Entrenador</th>
            {COLUMNAS.map((c) => (
              <Cabecera key={c.key} col={c.key} label={c.label} />
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenados.map((e, i) => (
            <tr
              key={e.id}
              className="border-b border-blanquiverde-verde/10 last:border-0 odd:bg-white even:bg-blanquiverde-verde/5 hover:bg-blanquiverde-verde/10"
            >
              <td className="py-2 px-4 text-gray-400">{i + 1}</td>
              <td className="py-2 px-4">
                <Link href={`/entrenadores/${e.slug}`} className="hover:underline font-medium">
                  {e.nombre_mostrado}
                </Link>
              </td>
              <td className="py-2 px-3 text-center">{e.partidos}</td>
              <td className="py-2 px-3 text-center text-green-600">{e.v}</td>
              <td className="py-2 px-3 text-center text-gray-500">{e.e}</td>
              <td className="py-2 px-3 text-center text-red-600">{e.d}</td>
              <td className="py-2 px-3 text-center">{e.pctV.toFixed(1)}%</td>
              <td className="py-2 px-3 text-center">{e.mejorRachaVictorias || '—'}</td>
              <td className="py-2 px-3 text-center">{e.mejorRachaInvicto || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
