'use client';

import { useState } from 'react';
import Link from 'next/link';

type Gol = {
  fecha: string;
  slug: string;
  rival: string;
  minuto: number;
  minutoExtra?: number | null;
  tipo: string;
  temporada: string;
};

export default function GoalsList({ goles }: { goles: Gol[] }) {
  const [abierto, setAbierto] = useState(false);
  const visibles = abierto ? goles : goles.slice(-5).reverse();

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2 font-serif">
        {abierto ? 'Todos los goles, del más antiguo al más reciente' : 'Los 5 más recientes'}
      </p>
      <ol className="space-y-1.5 text-sm font-serif">
        {visibles.map((g, i) => (
          <li key={i} className="flex justify-between">
            <span>
              <Link href={`/partidos/${g.slug}`} className="hover:underline">
                vs {g.rival}
              </Link>{' '}
              <span className="text-gray-400">({g.temporada})</span>
              {g.tipo && g.tipo !== 'NORMAL' && (
                <span className="text-gray-400"> — {g.tipo.toLowerCase().replace('_', ' ')}</span>
              )}
            </span>
            <span className="text-gray-500">
              {g.minuto}
              {g.minutoExtra ? `+${g.minutoExtra}` : ''}&apos;
            </span>
          </li>
        ))}
      </ol>
      {goles.length > 5 && (
        <button onClick={() => setAbierto((v) => !v)} className="text-xs text-blanquiverde-verde underline mt-3 font-serif">
          {abierto ? 'Ver menos' : `Ver todos los goles (${goles.length})`}
        </button>
      )}
    </div>
  );
}
