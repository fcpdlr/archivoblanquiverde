// @ts-nocheck
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getHomeData } from '@/lib/queries';
import BuscadorHero from './BuscadorHero';

const CORDOBA_ID = 74;

function EquipoMini({ equipo }: { equipo: any }) {
  const iniciales = (equipo?.nombre_corto ?? '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (equipo?.escudo_url) {
    return <img src={equipo.escudo_url} alt={equipo.nombre_corto} className="w-9 h-9 object-contain shrink-0" />;
  }
  return (
    <span className="w-9 h-9 shrink-0 rounded-full bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center">
      {iniciales}
    </span>
  );
}

export default async function HomePage() {
  const data = await getHomeData();
  const { stats, ultimoPartido, efemerides, jugadorDestacado, recordHistorico, temporadaDestacada, rivalesTop, aleatorios, cobertura, cumpleanosHoy } =
    data;

  const sugerencias: { label: string; href: string }[] = [];
  if (recordHistorico) sugerencias.push({ label: recordHistorico.nombre_mostrado, href: `/jugadores/${recordHistorico.slug}` });
  if (ultimoPartido) {
    const rival = ultimoPartido.local.id === CORDOBA_ID ? ultimoPartido.visitante : ultimoPartido.local;
    sugerencias.push({ label: `Córdoba - ${rival.nombre_corto}`, href: `/partidos/${ultimoPartido.slug}` });
  }
  if (temporadaDestacada) sugerencias.push({ label: temporadaDestacada.etiqueta, href: `/temporadas/${temporadaDestacada.etiqueta}` });

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero */}
      <section className="text-center pt-8 pb-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-blanquiverde-verde">
          Toda la historia del Córdoba CF, en un solo lugar
        </h1>
        <p className="text-gray-500 mt-3 mb-8">Busca jugadores, partidos, temporadas y rivales del archivo histórico blanquiverde.</p>
        <BuscadorHero sugerencias={sugerencias} />
      </section>

      {/* 2. Grandes cifras */}
      <section className="border-y py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x max-w-3xl mx-auto text-center">
          <Link href="/jugadores" className="px-4 group">
            <div className="font-mono text-3xl font-bold text-blanquiverde-verde group-hover:underline">{stats.jugadores}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Jugadores</div>
          </Link>
          <div className="px-4">
            <div className="font-mono text-3xl font-bold text-blanquiverde-verde">{stats.partidos}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Partidos</div>
          </div>
          <div className="px-4">
            <div className="font-mono text-3xl font-bold text-blanquiverde-verde">{stats.goles}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Goles</div>
          </div>
          <Link href="/temporadas" className="px-4 group">
            <div className="font-mono text-3xl font-bold text-blanquiverde-verde group-hover:underline">{stats.temporadas}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Temporadas</div>
          </Link>
        </div>
      </section>

      {/* 3. Empieza por aquí */}
      <section className="max-w-4xl mx-auto">
        <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Empieza por aquí</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/temporadas" className="border rounded-lg p-5 hover:border-blanquiverde-verde transition-colors">
            <div className="font-serif font-bold text-lg mb-1">Temporadas</div>
            <p className="text-sm text-gray-500">Recorre la historia del club año a año.</p>
          </Link>
          <Link href="/jugadores" className="border rounded-lg p-5 hover:border-blanquiverde-verde transition-colors">
            <div className="font-serif font-bold text-lg mb-1">Jugadores</div>
            <p className="text-sm text-gray-500">Consulta todos los futbolistas del archivo.</p>
          </Link>
          <Link href="/rivales" className="border rounded-lg p-5 hover:border-blanquiverde-verde transition-colors">
            <div className="font-serif font-bold text-lg mb-1">Rivales</div>
            <p className="text-sm text-gray-500">Consulta el historial contra cada club.</p>
          </Link>
        </div>
      </section>

      {/* 4. Último partido */}
      {ultimoPartido && (
        <section className="max-w-2xl mx-auto">
          <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Último partido</h2>
          <Link href={`/partidos/${ultimoPartido.slug}`} className="block border rounded-lg p-6 hover:border-blanquiverde-verde transition-colors">
            <div className="text-xs text-gray-400 uppercase tracking-wide text-center mb-3">
              {[ultimoPartido.competicion, ultimoPartido.temporada].filter(Boolean).join(' · ')}
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2 flex-1">
                <EquipoMini equipo={ultimoPartido.local} />
                <span className="text-sm font-medium text-center">{ultimoPartido.local.nombre_corto}</span>
              </div>
              <div className="font-mono text-3xl font-bold shrink-0">
                {ultimoPartido.golesLocalNum} - {ultimoPartido.golesVisitanteNum}
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <EquipoMini equipo={ultimoPartido.visitante} />
                <span className="text-sm font-medium text-center">{ultimoPartido.visitante.nombre_corto}</span>
              </div>
            </div>
            {(ultimoPartido.goleadoresLocal.length > 0 || ultimoPartido.goleadoresVisitante.length > 0) && (
              <div className="text-center text-xs text-gray-500 mt-4">
                {[...ultimoPartido.goleadoresLocal, ...ultimoPartido.goleadoresVisitante].join(', ')}
              </div>
            )}
            <div className="text-center text-xs text-gray-400 mt-3">
              {ultimoPartido.estadio}
              {ultimoPartido.estadio ? ' · ' : ''}
              {new Date(ultimoPartido.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </Link>
        </section>
      )}

      {/* 5. Tal día como hoy */}
      <section className="max-w-2xl mx-auto text-xs text-red-500 border border-red-300 rounded p-2 mb-4">
        DEBUG: hoy={efemerides.debugHoy} · filas totales={efemerides.debugTotal} · coincidencias={efemerides.debugCoincidencias}
      </section>
      {(efemerides.coincidencias.length > 0 || cumpleanosHoy.length > 0) && (
        <section className="max-w-2xl mx-auto">
          <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Tal día como hoy</h2>
          {efemerides.coincidencias.length > 0 && (
            <ul className="border rounded-lg divide-y mb-3">
              {efemerides.coincidencias.map((e: any) => {
                const resultado = e.golesCordoba > e.golesRival ? 'V' : e.golesCordoba === e.golesRival ? 'E' : 'D';
                const color = resultado === 'V' ? 'text-green-600' : resultado === 'D' ? 'text-red-600' : 'text-gray-500';
                return (
                  <li key={e.slug}>
                    <Link href={`/partidos/${e.slug}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm">
                      <span>
                        Córdoba {e.golesCordoba}-{e.golesRival} {e.rival}
                        {e.temporada && <span className="text-gray-400"> ({e.temporada})</span>}
                      </span>
                      <span className={`font-semibold ${color}`}>{resultado}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {cumpleanosHoy.length > 0 && (
            <div className="border rounded-lg px-4 py-3 text-sm">
              <span className="text-gray-400">🎂 Cumpleaños: </span>
              {cumpleanosHoy.map((c: any, i: number) => (
                <span key={c.slug}>
                  <Link href={`/${c.esJugador ? 'jugadores' : 'entrenadores'}/${c.slug}`} className="hover:underline">
                    {c.nombre_mostrado}
                  </Link>
                  {i < cumpleanosHoy.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Jugador destacado */}
      {jugadorDestacado && (
        <section className="max-w-2xl mx-auto">
          <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Jugador destacado</h2>
          <Link
            href={`/jugadores/${jugadorDestacado.slug}`}
            className="flex items-center gap-6 border rounded-lg p-6 hover:border-blanquiverde-verde transition-colors"
          >
            {jugadorDestacado.foto_url ? (
              <img src={jugadorDestacado.foto_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-blanquiverde-verde shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-blanquiverde-verde flex items-center justify-center text-3xl text-gray-300 font-serif shrink-0">
                {jugadorDestacado.nombre_mostrado?.[0]}
              </div>
            )}
            <div>
              <div className="font-serif text-2xl font-bold text-blanquiverde-verde">{jugadorDestacado.nombre_mostrado}</div>
              {jugadorDestacado.posicion && <div className="text-sm text-gray-500 mb-2">{jugadorDestacado.posicion}</div>}
              <div className="flex gap-4 text-sm">
                <span>
                  <span className="font-mono font-bold">{jugadorDestacado.partidos}</span> partidos
                </span>
                {jugadorDestacado.goles > 0 && (
                  <span>
                    <span className="font-mono font-bold">{jugadorDestacado.goles}</span> goles
                  </span>
                )}
                <span>
                  <span className="font-mono font-bold">{jugadorDestacado.temporadas}</span> temporadas
                </span>
              </div>
              {jugadorDestacado.rankingPartidos && (
                <div className="text-xs text-gray-400 mt-1">#{jugadorDestacado.rankingPartidos} en partidos históricos</div>
              )}
            </div>
          </Link>
        </section>
      )}

      {/* 7. Récord histórico */}
      {recordHistorico && (
        <section className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Récord histórico</h2>
          <Link href={`/jugadores/${recordHistorico.slug}`} className="block border-2 border-blanquiverde-verde rounded-lg p-6 hover:bg-gray-50">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Máximo goleador histórico</div>
            <div className="font-serif text-2xl font-bold text-blanquiverde-verde">{recordHistorico.nombre_mostrado}</div>
            <div className="font-mono text-3xl font-bold mt-1">{recordHistorico.goles} goles</div>
          </Link>
        </section>
      )}

      {/* 8. Explora una temporada */}
      {temporadaDestacada && (
        <section className="max-w-2xl mx-auto">
          <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Explora una temporada</h2>
          <Link
            href={`/temporadas/${temporadaDestacada.etiqueta}`}
            className="block border rounded-lg p-6 hover:border-blanquiverde-verde transition-colors"
          >
            <div className="text-center mb-4">
              <div className="font-serif text-2xl font-bold text-blanquiverde-verde">Temporada {temporadaDestacada.etiqueta}</div>
              {temporadaDestacada.competicion && <div className="text-sm text-gray-500">{temporadaDestacada.competicion}</div>}
            </div>
            <div className="flex justify-center gap-8 text-center text-sm">
              {temporadaDestacada.puesto && (
                <div>
                  <div className="font-mono text-xl font-bold">{temporadaDestacada.puesto}º</div>
                  <div className="text-gray-400 text-xs">Puesto</div>
                </div>
              )}
              <div>
                <div className="font-mono text-xl font-bold">{temporadaDestacada.partidos}</div>
                <div className="text-gray-400 text-xs">Partidos</div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold">{temporadaDestacada.victorias}</div>
                <div className="text-gray-400 text-xs">Victorias</div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold">{temporadaDestacada.goles}</div>
                <div className="text-gray-400 text-xs">Goles</div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* 9. Rivales históricos */}
      {rivalesTop.length > 0 && (
        <section className="max-w-2xl mx-auto">
          <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Rivales históricos</h2>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase border-b bg-gray-50">
                  <th className="py-2 px-4">Rival</th>
                  <th className="py-2 px-4 text-center">PJ</th>
                  <th className="py-2 px-4 text-center">V</th>
                  <th className="py-2 px-4 text-center">E</th>
                  <th className="py-2 px-4 text-center">D</th>
                </tr>
              </thead>
              <tbody>
                {rivalesTop.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 px-4 font-medium">{r.nombre}</td>
                    <td className="py-2 px-4 text-center">{r.pj}</td>
                    <td className="py-2 px-4 text-center">{r.v}</td>
                    <td className="py-2 px-4 text-center">{r.e}</td>
                    <td className="py-2 px-4 text-center">{r.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-3">
            <Link href="/rivales" className="text-sm text-blanquiverde-verde hover:underline">
              Ver todos los rivales →
            </Link>
          </div>
        </section>
      )}

      {/* 10. Descubre algo */}
      <section className="max-w-2xl mx-auto text-center">
        <h2 className="font-serif text-xl font-bold text-blanquiverde-verde mb-4">Descubre algo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aleatorios.partidoSlug && (
            <Link href={`/partidos/${aleatorios.partidoSlug}`} className="border rounded-lg p-5 hover:border-blanquiverde-verde transition-colors">
              Partido aleatorio
            </Link>
          )}
          {aleatorios.jugadorSlug && (
            <Link href={`/jugadores/${aleatorios.jugadorSlug}`} className="border rounded-lg p-5 hover:border-blanquiverde-verde transition-colors">
              Jugador aleatorio
            </Link>
          )}
          {aleatorios.temporadaEtiqueta && (
            <Link
              href={`/temporadas/${aleatorios.temporadaEtiqueta}`}
              className="border rounded-lg p-5 hover:border-blanquiverde-verde transition-colors"
            >
              Temporada aleatoria
            </Link>
          )}
        </div>
      </section>

      {/* 11. Cobertura del archivo */}
      <section className="max-w-2xl mx-auto text-center text-sm text-gray-400 border-t pt-8">
        <p>
          {cobertura.partidosRegistrados} partidos registrados
          {cobertura.porcentajeGoleadores !== null && ` · ${cobertura.porcentajeGoleadores}% de goles con autor identificado`}
          {' · '}
          {cobertura.eventosRegistrados} eventos registrados
        </p>
      </section>
    </div>
  );
}
