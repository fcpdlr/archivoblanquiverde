// @ts-nocheck
import { getEntrenadorBySlug } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PartidosDirigidosList from './PartidosDirigidosList';

function nombreCompleto(persona: any) {
  const partes = [persona.nombre, persona.apellido1, persona.apellido2].filter(Boolean);
  const completo = partes.length > 0 ? partes.join(' ') : null;
  return completo && completo !== persona.nombre_mostrado ? completo : null;
}

function fechaCorta(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function EntrenadorPage({ params }: { params: { slug: string } }) {
  const data = await getEntrenadorBySlug(params.slug);
  if (!data) return notFound();

  const { persona, partidos, totalPartidos, victorias, empates, derrotas, porcentajes, rankingPartidos, debut, ultimo, jugadoresMasUtilizados, esTambienJugador } = data;

  const nombreLargo = nombreCompleto(persona);

  function ResultadoPartidoDestacado({ p }: { p: any }) {
    return (
      <Link href={`/partidos/${p.slug}`} className="hover:underline">
        {p.local ? 'Córdoba' : p.rival} {p.golesCordoba}-{p.golesRival} {p.local ? p.rival : 'Córdoba'}
      </Link>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col items-center text-center pt-4 pb-8">
        {persona.foto_url ? (
          <img
            src={persona.foto_url}
            alt={persona.nombre_mostrado}
            className="w-40 h-40 rounded-full object-cover border-2 border-blanquiverde-verde"
          />
        ) : (
          <div className="w-40 h-40 rounded-full bg-gray-100 border-2 border-blanquiverde-verde flex items-center justify-center text-5xl text-gray-300 font-serif">
            {persona.nombre_mostrado?.[0] ?? '?'}
          </div>
        )}

        <h1 className="font-serif text-5xl font-bold tracking-wide text-blanquiverde-verde mt-6 uppercase">
          {persona.nombre_mostrado}
        </h1>
        <p className="text-sm text-gray-400 mt-1 uppercase tracking-wide">Entrenador</p>

        <div className="mt-4 text-sm space-y-1">
          {nombreLargo && (
            <p>
              <span className="font-bold">Nombre completo:</span> {nombreLargo}
            </p>
          )}
          {persona.fecha_nacimiento && (
            <p>
              <span className="font-bold">Fecha de nacimiento:</span> {fechaCorta(persona.fecha_nacimiento)}
              {persona.fecha_fallecimiento && <> — falleció el {fechaCorta(persona.fecha_fallecimiento)}</>}
            </p>
          )}
          {persona.lugar_nacimiento && (
            <p>
              <span className="font-bold">Lugar de nacimiento:</span> {persona.lugar_nacimiento}
            </p>
          )}
        </div>

        {esTambienJugador && (
          <Link href={`/jugadores/${persona.slug}`} className="mt-4 text-sm text-blanquiverde-verde hover:underline">
            También jugó en el Córdoba CF →
          </Link>
        )}
      </div>

      {/* Partidos + ranking */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="border rounded-lg text-center py-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Partidos dirigidos</div>
          <div className="text-4xl font-bold font-serif text-blanquiverde-verde mt-1">{totalPartidos}</div>
          {rankingPartidos > 0 && <div className="text-xs text-gray-400 mt-1">#{rankingPartidos} en la historia</div>}
        </div>
      </div>

      {/* V/E/D con % a 1 decimal */}
      <div className="border rounded-lg grid grid-cols-3 divide-x mb-8 py-4 text-center">
        <div>
          <div className="text-xs uppercase text-gray-500">Victorias</div>
          <div className="text-2xl font-bold text-blanquiverde-verde">{victorias}</div>
          <div className="text-xs text-gray-400">({porcentajes.v}%)</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Empates</div>
          <div className="text-2xl font-bold text-blanquiverde-verde">{empates}</div>
          <div className="text-xs text-gray-400">({porcentajes.e}%)</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Derrotas</div>
          <div className="text-2xl font-bold text-blanquiverde-verde">{derrotas}</div>
          <div className="text-xs text-gray-400">({porcentajes.d}%)</div>
        </div>
      </div>

      {/* Debut y último partido */}
      {(debut || ultimo) && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {debut && (
            <div className="border-2 border-blanquiverde-verde rounded-lg p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">Primer partido</div>
              <div className="text-sm text-gray-500 mt-1">{fechaCorta(debut.fecha)}</div>
              <div className="mt-1 font-semibold">
                <ResultadoPartidoDestacado p={debut} />
              </div>
            </div>
          )}
          {ultimo && (
            <div className="border-2 border-blanquiverde-verde rounded-lg p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">Último partido</div>
              <div className="text-sm text-gray-500 mt-1">{fechaCorta(ultimo.fecha)}</div>
              <div className="mt-1 font-semibold">
                <ResultadoPartidoDestacado p={ultimo} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listado de partidos */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">Partidos dirigidos ({totalPartidos})</h2>
        <PartidosDirigidosList partidos={partidos} />
      </div>

      {/* Jugadores más utilizados */}
      {jugadoresMasUtilizados.length > 0 && (
        <div className="border rounded-lg p-6 mb-10">
          <h2 className="font-serif font-bold text-lg text-blanquiverde-verde mb-3">Jugadores más utilizados</h2>
          <ol className="space-y-1.5 text-sm">
            {jugadoresMasUtilizados.map((j: any, i: number) => (
              <li key={j.persona_id} className="flex justify-between">
                <span>
                  <span className="text-gray-400 mr-2">{i + 1}.</span>
                  <Link href={`/jugadores/${j.slug}`} className="hover:underline">
                    {j.nombre_mostrado}
                  </Link>
                </span>
                <span className="text-gray-500">{j.partidos}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
