'use client';

import { useState } from 'react';
import Link from 'next/link';

type PartidoRacha = {
  fecha: string;
  slug: string;
  rival: string;
  local: boolean;
  golesCordoba: number | null;
  golesRival: number | null;
  resultado: 'V' | 'E' | 'D' | null;
  temporada: string | null;
};

export default function RachaCard({
  titulo,
  longitud,
  partidos,
  colorResultado,
}: {
  titulo: string;
  longitud: number;
  partidos: PartidoRacha[];
  colorResultado: 'green' | 'red' | 'blue' | 'gray';
}) {
  const [abierto, setAbierto] = useState(false);

  const colores: Record<string, string> = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blanquiverde-verde',
    gray: 'text-gray-500',
  };

  function colorTexto(r: 'V' | 'E' | 'D' | null) {
    if (r === 'V') return 'text-green-600';
    if (r === 'D') return 'text-red-600';
    return 'text-gray-500';
  }

  if (longitud === 0) {
    return (
      <div className="border rounded-lg text-center py-4">
        <div className="text-xs uppercase tracking-wide text-gray-500">{titulo}</div>
        <div className="text-3xl font-bold font-serif text-gray-300 mt-1">—</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg py-4 px-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full text-center"
        disabled={partidos.length === 0}
      >
        <div className="text-xs uppercase tracking-wide text-gray-500">{titulo}</div>
        <div className={`text-3xl font-bold font-serif mt-1 ${colores[colorResultado]}`}>{longitud}</div>
        {partidos.length > 0 && (
          <div className="text-xs text-blanquiverde-verde underline mt-1">{abierto ? 'Ocultar' : 'Ver partidos'}</div>
        )}
      </button>
      {abierto && (
        <ol className="space-y-1.5 text-sm mt-3 pt-3 border-t">
          {partidos.map((p, i) => (
            <li key={i} className="flex justify-between items-center">
              <Link href={`/partidos/${p.slug}`} className="hover:underline">
                {p.local ? 'vs' : '@'} {p.rival}
                {p.temporada && <span className="text-gray-400"> ({p.temporada})</span>}
              </Link>
              <span className="flex items-center gap-2">
                <span className="text-gray-500">
                  {p.golesCordoba ?? '?'}-{p.golesRival ?? '?'}
                </span>
                <span className={`font-semibold ${colorTexto(p.resultado)}`}>{p.resultado ?? ''}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
