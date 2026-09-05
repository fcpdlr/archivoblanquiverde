// @ts-nocheck
export const dynamic = 'force-dynamic';

import { getRecordsData } from '@/lib/queries';
import Link from 'next/link';

function ResultadoPartido({ p }: { p: any }) {
  return (
    <Link href={`/partidos/${p.slug}`} className="hover:underline">
      {p.local ? 'Córdoba' : p.rival} {p.golesCordoba}-{p.golesRival} {p.local ? p.rival : 'Córdoba'}
    </Link>
  );
}

function fechaCorta(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function RecordsPage() {
  const { mayoresVictorias, mayoresDerrotas, rachas, resultadosOrdenados, totalResultadosDistintos, meses, masJovenes, masVeteranos } =
    await getRecordsData();

  const maxPj = Math.max(...meses.map((m: any) => m.pj), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">
      <div className="text-center pt-4">
        <h1 className="font-serif text-4xl font-bold text-blanquiverde-verde">Récords y curiosidades</h1>
        <p className="text-gray-500 mt-2">Los datos más llamativos de toda la historia del Córdoba CF.</p>
      </div>

      {/* Goleadas */}
      <section>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-4">Mayores goleadas</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Mayores victorias</h3>
            <ol className="border rounded-lg divide-y">
              {mayoresVictorias.map((p: any, i: number) => (
                <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400 w-5">{i + 1}</span>
                  <span className="flex-1">
                    <ResultadoPartido p={p} />
                    <div className="text-xs text-gray-400">
                      {fechaCorta(p.fecha)} {p.temporada && `· ${p.temporada}`}
                    </div>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Mayores derrotas</h3>
            <ol className="border rounded-lg divide-y">
              {mayoresDerrotas.map((p: any, i: number) => (
                <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400 w-5">{i + 1}</span>
                  <span className="flex-1">
                    <ResultadoPartido p={p} />
                    <div className="text-xs text-gray-400">
                      {fechaCorta(p.fecha)} {p.temporada && `· ${p.temporada}`}
                    </div>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Rachas del club */}
      <section>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-4">Rachas históricas del club</h2>
        <p className="text-sm text-gray-500 mb-4">
          A diferencia de las rachas por entrenador, estas son independientes de quién estuviera en el banquillo.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { titulo: 'Mejor racha de victorias', r: rachas.mejorRachaVictorias, color: 'text-green-600' },
            { titulo: 'Peor racha de derrotas', r: rachas.peorRachaDerrotas, color: 'text-red-600' },
            { titulo: 'Mejor racha sin perder', r: rachas.mejorRachaInvicto, color: 'text-blanquiverde-verde' },
            { titulo: 'Peor racha sin ganar', r: rachas.peorRachaSinGanar, color: 'text-gray-500' },
          ].map(({ titulo, r, color }) => (
            <div key={titulo} className="border rounded-lg text-center py-4 px-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">{titulo}</div>
              <div className={`text-3xl font-bold font-serif mt-1 ${color}`}>{r.longitud}</div>
              {r.partidos.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  {fechaCorta(r.partidos[0].fecha)} — {fechaCorta(r.partidos[r.partidos.length - 1].fecha)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Resultados más repetidos */}
      <section>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-1">Resultados más repetidos</h2>
        <p className="text-sm text-gray-500 mb-4">
          El Córdoba ha terminado sus partidos en <span className="font-semibold">{totalResultadosDistintos}</span> marcadores
          distintos (a favor y en contra combinados) a lo largo de su historia.
        </p>
        <div className="border rounded-lg divide-y">
          {resultadosOrdenados.slice(0, 10).map((r: any, i: number) => (
            <div key={r.resultado} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-gray-400 w-5">{i + 1}</span>
              <span className="font-mono font-semibold flex-1">{r.resultado}</span>
              <span className="text-gray-500">
                {r.cuenta} {r.cuenta === 1 ? 'vez' : 'veces'}
              </span>
              <Link href={`/partidos/${r.ejemplo.slug}`} className="text-xs text-blanquiverde-verde hover:underline ml-4">
                ejemplo →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Rendimiento por mes */}
      <section>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-4">Rendimiento por mes del año</h2>
        <div className="border rounded-lg overflow-hidden">
          {meses.map((m: any) => {
            const pctV = m.pj > 0 ? (m.v / m.pj) * 100 : 0;
            const pctE = m.pj > 0 ? (m.e / m.pj) * 100 : 0;
            const pctD = m.pj > 0 ? (m.d / m.pj) * 100 : 0;
            return (
              <div key={m.mes} className="flex items-center gap-3 px-4 py-2 border-b last:border-0 text-sm">
                <span className="w-24 text-gray-600">{m.nombre}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden flex bg-gray-100">
                  <div className="bg-green-500" style={{ width: `${pctV}%` }} />
                  <div className="bg-gray-300" style={{ width: `${pctE}%` }} />
                  <div className="bg-red-500" style={{ width: `${pctD}%` }} />
                </div>
                <span className="w-28 text-right text-gray-400 text-xs">
                  {m.v}V {m.e}E {m.d}D ({m.pj})
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Debuts */}
      <section>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-4">Debuts más jóvenes y más veteranos</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Debuts más jóvenes</h3>
            <ol className="border rounded-lg divide-y">
              {masJovenes.map((j: any, i: number) => (
                <li key={j.slug} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400 w-5">{i + 1}</span>
                  <Link href={`/jugadores/${j.slug}`} className="flex-1 hover:underline">
                    {j.nombre_mostrado}
                  </Link>
                  <span className="text-gray-500 text-xs">{j.edadAnios} años</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Debuts más veteranos</h3>
            <ol className="border rounded-lg divide-y">
              {masVeteranos.map((j: any, i: number) => (
                <li key={j.slug} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400 w-5">{i + 1}</span>
                  <Link href={`/jugadores/${j.slug}`} className="flex-1 hover:underline">
                    {j.nombre_mostrado}
                  </Link>
                  <span className="text-gray-500 text-xs">{j.edadAnios} años</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
