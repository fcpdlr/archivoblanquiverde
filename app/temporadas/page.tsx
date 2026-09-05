// @ts-nocheck
export const dynamic = 'force-dynamic';

import { getListadoTemporadas } from '@/lib/queries';
import Link from 'next/link';

export default async function TemporadasIndexPage() {
  const temporadas = await getListadoTemporadas();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-blanquiverde-verde mb-2">Temporadas</h1>
      <p className="text-gray-500 mb-6">Todas las temporadas del Córdoba CF registradas en el archivo.</p>
      <div className="border rounded-lg divide-y">
        {temporadas.map((t: any) => (
          <Link
            key={t.etiqueta}
            href={`/temporadas/${t.etiqueta}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <span className="font-serif font-medium">{t.etiqueta}</span>
            <span className="text-sm text-gray-400">
              {t.competiciones.join(' / ')} · {t.partidos} partidos
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
