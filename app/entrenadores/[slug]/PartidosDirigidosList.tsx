'use client';

import { useState } from 'react';
import Link from 'next/link';

type PartidoDirigido = {
  fecha: string;
  slug: string;
  rival: string;
  local: boolean;
  golesCordoba: number | null;
  golesRival: number | null;
  resultado: 'V' | 'E' | 'D' | null;
  temporada: string | null;
};

export default function PartidosDirigidosList({ partidos }: { partidos: PartidoDirigido[] }) {
  const [abierto, setAbierto] = useState(false);
  const visibles = abierto ? [...partidos].reverse() : [...partidos].slice(-8).reverse();

  function colorResultado(r: 'V' | 'E' | 'D' | null) {
    if (r === 'V') return 'text-green-600';
    if (r === 'D') return 'text-red-600';
    return 'text-gray-500';
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">{abierto ? 'Todos los partidos, del más reciente al más antiguo' : 'Los 8 más recientes'}</p>
      <ol className="space-y-1.5 text-sm">
        {visibles.map((p, i) => (
          <li key={i} className="flex justify-between items-center">
            <Link href={`/partidos/${p.slug}`} className="hover:underline">
              {p.local ? 'vs' : '@'} {p.rival}
              {p.temporada && <span className="text-gray-400"> ({p.temporada})</span>}
            </Link>
            <span className="flex items-center gap-2">
              <span className="text-gray-500">
                {p.golesCordoba ?? '?'}-{p.golesRival ?? '?'}
              </span>
              <span className={`font-semibold ${colorResultado(p.resultado)}`}>{p.resultado ?? ''}</span>
            </span>
          </li>
        ))}
      </ol>
      {partidos.length > 8 && (
        <button onClick={() => setAbierto((v) => !v)} className="text-xs text-blanquiverde-verde underline mt-3">
          {abierto ? 'Ver menos' : `Ver todos los partidos (${partidos.length})`}
        </button>
      )}
    </div>
  );
}
