// @ts-nocheck
import { getTemporadaByEtiqueta } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const CORDOBA_ID = 74;

function esCopa(nombre: string) {
  return /copa/i.test(nombre);
}

function posicionMostrada(j: any) {
  if (!j.posicion_especifica) return j.posicion_general ?? '—';
  if (j.posicion_especifica.toLowerCase().includes('sin especificar')) return j.posicion_general ?? '—';
  return j.posicion_especifica;
}

export default async function TemporadaPage({ params }: { params: { etiqueta: string } }) {
  const data = await getTemporadaByEtiqueta(params.etiqueta);
  if (!data) return notFound();

  const { temporada, partidos, competiciones, resumen, plantilla, maximoGoleador } = data;

  if (partidos.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <h1 className="font-serif text-3xl font-bold text-blanquiverde-verde mb-2">Temporada {temporada.etiqueta}</h1>
        <p className="text-gray-400">No hay partidos registrados para esta temporada.</p>
      </div>
    );
  }

  const competicionesLiga = competiciones.filter((c: any) => !esCopa(c.nombre));
  const competicionesCopa = competiciones.filter((c: any) => esCopa(c.nombre));
  const nombresLiga = competicionesLiga.map((c: any) => c.nombre).join(' / ');

  function ResultadoPartido({ p }: { p: any }) {
    const cordobaEsLocal = p.equipo_local.id === CORDOBA_ID;
    const rival = cordobaEsLocal ? p.equipo_visitante : p.equipo_local;
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;
    let resultado: 'V' | 'E' | 'D' | null = null;
    if (golesCordoba != null && golesRival != null) {
      resultado = golesCordoba > golesRival ? 'V' : golesCordoba === golesRival ? 'E' : 'D';
    }
    const color = resultado === 'V' ? 'text-green-600' : resultado === 'D' ? 'text-red-600' : 'text-gray-500';
    return (
      <tr className="border-b border-blanquiverde-verde/10 last:border-0 odd:bg-white even:bg-blanquiverde-verde/5 hover:bg-blanquiverde-verde/10">
        <td className="py-2 pr-4 text-gray-500">{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</td>
        <td className="py-2 pr-4">{cordobaEsLocal ? 'Casa' : 'Fuera'}</td>
        <td className="py-2 pr-4">
          <Link href={`/partidos/${p.slug}`} className="hover:underline font-medium">
            vs {rival.nombre_corto}
          </Link>
        </td>
        <td className={`py-2 pr-4 font-semibold ${color}`}>
          {p.goles_local ?? '?'}-{p.goles_visitante ?? '?'}
        </td>
        <td className="py-2 pr-4 text-gray-400">{p.jornada ?? ''}</td>
      </tr>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="text-center pt-4 pb-2">
        <h1 className="font-serif text-4xl font-bold text-blanquiverde-verde">Temporada {temporada.etiqueta}</h1>
        {nombresLiga && <p className="text-gray-500 mt-1">{nombresLiga}</p>}
      </div>

      {/* Puesto final / ascenso-descenso — solo si lo tenemos */}
      {competicionesLiga.some((c: any) => c.puestoFinal || c.resultadoCordoba) && (
        <div className="border-2 border-blanquiverde-verde rounded-lg p-4 text-center">
          {competicionesLiga.map(
            (c: any) =>
              (c.puestoFinal || c.resultadoCordoba) && (
                <div key={c.edicionId}>
                  {c.puestoFinal && (
                    <span className="font-serif text-2xl font-bold text-blanquiverde-verde">{c.puestoFinal}º</span>
                  )}
                  {c.resultadoCordoba && (
                    <span className="ml-3 text-sm uppercase tracking-wide text-gray-600">{c.resultadoCordoba}</span>
                  )}
                </div>
              )
          )}
        </div>
      )}

      {/* Resumen general */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Partidos</div>
          <div className="text-3xl font-bold font-serif text-blanquiverde-verde mt-1">{resumen.partidos}</div>
        </div>
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Goles</div>
          <div className="text-3xl font-bold font-serif text-blanquiverde-verde mt-1">
            {resumen.golesFavor}-{resumen.golesContra}
          </div>
        </div>
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Mejor racha invicto</div>
          <div className="text-3xl font-bold font-serif text-blanquiverde-verde mt-1">{resumen.rachaInvictoMax}</div>
        </div>
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Racha de victorias</div>
          <div className="text-3xl font-bold font-serif text-blanquiverde-verde mt-1">{resumen.rachaVictoriasMax}</div>
        </div>
      </div>

      {/* V/E/D */}
      <div className="border rounded-lg grid grid-cols-3 divide-x py-4 text-center">
        <div>
          <div className="text-xs uppercase text-gray-500">Victorias</div>
          <div className="text-2xl font-bold text-blanquiverde-verde">{resumen.victorias}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Empates</div>
          <div className="text-2xl font-bold text-blanquiverde-verde">{resumen.empates}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Derrotas</div>
          <div className="text-2xl font-bold text-blanquiverde-verde">{resumen.derrotas}</div>
        </div>
      </div>

      {/* Máximo goleador */}
      {maximoGoleador && (
        <div className="border-2 border-blanquiverde-verde rounded-lg p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-gray-500">Máximo goleador</div>
          <div className="mt-1">
            <Link href={`/jugadores/${maximoGoleador.slug}`} className="font-serif text-xl font-bold text-blanquiverde-verde hover:underline">
              {maximoGoleador.nombre_mostrado}
            </Link>{' '}
            <span className="text-gray-500">
              — {maximoGoleador.goles} gol{maximoGoleador.goles !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Plantilla */}
      <div>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-3">Plantilla</h2>
        <p className="sm:hidden text-xs text-gray-400 mb-1">Desliza para ver toda la tabla →</p>
        <div className="overflow-x-auto border border-blanquiverde-verde/40 rounded-lg">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-white text-xs uppercase bg-blanquiverde-verde">
                <th className="py-2 px-4 text-center">#</th>
                <th className="py-2 px-4">Jugador</th>
                <th className="py-2 px-4">Posición</th>
                <th className="py-2 px-4 text-center">Partidos</th>
                <th className="py-2 px-4 text-center">Titular</th>
                <th className="py-2 px-4 text-center">Goles</th>
                <th className="py-2 px-4 text-center">Tarjetas</th>
              </tr>
            </thead>
            <tbody>
              {plantilla.map((j: any) => (
                <tr
                  key={j.id}
                  className="border-b border-blanquiverde-verde/10 last:border-0 odd:bg-white even:bg-blanquiverde-verde/5 hover:bg-blanquiverde-verde/10"
                >
                  <td className="py-2 px-4 text-center text-gray-400 font-mono">{j.dorsal ?? ''}</td>
                  <td className="py-2 px-4">
                    <Link href={`/jugadores/${j.slug}`} className="hover:underline font-medium">
                      {j.nombre_mostrado}
                    </Link>
                  </td>
                  <td className="py-2 px-4 text-gray-500">{posicionMostrada(j)}</td>
                  <td className="py-2 px-4 text-center">{j.partidos}</td>
                  <td className="py-2 px-4 text-center">{j.titularidades}</td>
                  <td className="py-2 px-4 text-center">{j.goles > 0 ? j.goles : ''}</td>
                  <td className="py-2 px-4 text-center">{j.tarjetas > 0 ? j.tarjetas : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copa — sección aparte si hubo participación */}
      {competicionesCopa.length > 0 && (
        <div>
          <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-3">
            Copa {competicionesCopa.map((c: any) => `(${c.partidos} partidos, ${c.victorias}V ${c.empates}E ${c.derrotas}D)`).join(', ')}
          </h2>
          <p className="sm:hidden text-xs text-gray-400 mb-1">Desliza para ver toda la tabla →</p>
          <div className="overflow-x-auto border border-blanquiverde-verde/40 rounded-lg">
            <table className="w-full text-sm whitespace-nowrap">
              <tbody>
                {partidos
                  .filter((p: any) => competicionesCopa.some((c: any) => c.edicionId === p.edicion_id))
                  .map((p: any) => (
                    <ResultadoPartido key={p.id} p={p} />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listado completo de partidos */}
      <div>
        <h2 className="font-serif font-bold text-xl text-blanquiverde-verde mb-3">Todos los partidos</h2>
        <p className="sm:hidden text-xs text-gray-400 mb-1">Desliza para ver toda la tabla →</p>
        <div className="overflow-x-auto border border-blanquiverde-verde/40 rounded-lg">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-white text-xs uppercase bg-blanquiverde-verde">
                <th className="py-2 px-4">Fecha</th>
                <th className="py-2 px-4">Local/Fuera</th>
                <th className="py-2 px-4">Rival</th>
                <th className="py-2 px-4">Resultado</th>
                <th className="py-2 px-4">Jornada</th>
              </tr>
            </thead>
            <tbody>
              {partidos.map((p: any) => (
                <ResultadoPartido key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
