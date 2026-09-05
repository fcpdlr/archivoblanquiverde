// @ts-nocheck
export const dynamic = 'force-dynamic';

import { getPartidosPorResultado } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';

function fechaCorta(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function ResultadoPage({ params }: { params: { marcador: string } }) {
  const partes = params.marcador.split('-').map(Number);
  if (partes.length !== 2 || partes.some((n) => Number.isNaN(n) || n < 0)) return notFound();
  const [golesCordoba, golesRival] = partes;

  const partidos = await getPartidosPorResultado(golesCordoba, golesRival);
  if (partidos.length === 0) return notFound();

  const resultado = golesCordoba > golesRival ? 'V' : golesCordoba === golesRival ? 'E' : 'D';
  const colorTitulo = resultado === 'V' ? 'text-green-600' : resultado === 'D' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="text-center pt-4 pb-6">
        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Marcador</p>
        <h1 className={`font-serif text-5xl font-bold ${colorTitulo}`}>
          {golesCordoba}-{golesRival}
        </h1>
        <p className="text-gray-500 mt-3 max-w-md mx-auto text-sm">
          Este marcador es siempre "goles del Córdoba - goles del rival", sin importar si el partido fue en casa o
          fuera: un {golesCordoba}-{golesRival} en el marcador oficial de un partido a domicilio (donde el Córdoba
          aparece como visitante) cuenta igual que uno jugado en casa.
        </p>
      </div>

      <div className="text-center mb-4">
        <span className="text-sm text-gray-500">
          Se ha dado <span className="font-semibold text-gray-700">{partidos.length}</span>{' '}
          {partidos.length === 1 ? 'vez' : 'veces'} en toda la historia del club
        </span>
      </div>

      <ol className="border rounded-lg divide-y">
        {partidos.map((p: any, i: number) => (
          <li key={i}>
            <Link href={`/partidos/${p.slug}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm">
              <span>
                {p.local ? 'vs' : '@'} {p.rival}
                {p.temporada && <span className="text-gray-400"> ({p.temporada})</span>}
              </span>
              <span className="text-gray-400 text-xs">{fechaCorta(p.fecha)}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="text-center mt-6">
        <Link href="/records" className="text-sm text-blanquiverde-verde hover:underline">
          ← Volver a Récords
        </Link>
      </div>
    </div>
  );
}
