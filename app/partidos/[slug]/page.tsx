// @ts-nocheck
// Tipado laxo a propósito por ahora (ver nota en commits anteriores).
import { getPartidoBySlug } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: p } = await supabase
    .from('partidos')
    .select(
      `fecha, goles_local, goles_visitante,
       equipo_local:equipos!partidos_equipo_local_id_fkey(nombre_corto),
       equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(nombre_corto),
       edicion:ediciones_competicion(temporada:temporadas(etiqueta))`
    )
    .eq('slug', params.slug)
    .single();
  if (!p) return { title: 'Partido no encontrado · Archivo Blanquiverde' };
  const local = (p as any).equipo_local?.nombre_corto ?? '?';
  const visitante = (p as any).equipo_visitante?.nombre_corto ?? '?';
  const temporada = (p as any).edicion?.temporada?.etiqueta;
  const marcador = p.goles_local != null ? ` ${p.goles_local}-${p.goles_visitante}` : '';
  return {
    title: `${local}${marcador} ${visitante}${temporada ? ` (${temporada})` : ''} · Archivo Blanquiverde`,
    description: `Resultado, alineaciones y goles del ${local} ${p.goles_local ?? '?'}-${p.goles_visitante ?? '?'} ${visitante}.`,
  };
}

function formatFecha(fecha: string) {
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Insignia de equipo — placeholder con iniciales hasta que carguemos escudo_url real.
// 0 de 265 equipos tienen escudo_url hoy; en cuanto se rellene, esto lo recoge solo.
function EquipoBadge({ equipo, size = 'sm' }: { equipo: any; size?: 'sm' | 'md' }) {
  const iniciales = (equipo?.nombre_corto ?? '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const dim = size === 'md' ? 'w-10 h-10 text-sm' : 'w-6 h-6 text-[10px]';
  if (equipo?.escudo_url) {
    return <img src={equipo.escudo_url} alt={equipo.nombre_corto} className={`${dim} object-contain shrink-0`} />;
  }
  return (
    <span
      className={`${dim} shrink-0 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center`}
      title={equipo?.nombre_corto}
    >
      {iniciales}
    </span>
  );
}

// Nombre de persona: clicable solo si es del Córdoba. Los rivales, en texto plano
// hasta que fusionemos sus fichas duplicadas con el resto de la base.
function NombrePersona({ persona, esCordoba }: { persona: any; esCordoba: boolean }) {
  if (!persona) return <>desconocido</>;
  if (esCordoba) {
    return (
      <Link href={`/jugadores/${persona.slug}`} className="hover:underline">
        {persona.nombre_mostrado}
      </Link>
    );
  }
  return <>{persona.nombre_mostrado}</>;
}

export default async function PartidoPage({ params }: { params: { slug: string } }) {
  const data = await getPartidoBySlug(params.slug);
  if (!data) return notFound();

  const { arbitros, entrenadores, convocatorias, goles, tarjetas, sustituciones } = data;
  const partido: any = data.partido;
  const local: any = partido.equipo_local;
  const visitante: any = partido.equipo_visitante;
  const edicion: any = partido.edicion;
  const estadio: any = partido.estadio;

  const convLocal = convocatorias.filter((c: any) => c.equipo_id === local.id);
  const convVisitante = convocatorias.filter((c: any) => c.equipo_id === visitante.id);
  const hayAmbasAlineaciones = convLocal.length > 0 && convVisitante.length > 0;
  const hayAlgunaAlineacion = convLocal.length > 0 || convVisitante.length > 0;

  const entrenadorLocal = entrenadores.find((e: any) => e.equipo_id === local.id);
  const entrenadorVisitante = entrenadores.find((e: any) => e.equipo_id === visitante.id);
  const arbitro = arbitros[0];

  // Goleadores agrupados por equipo, para la línea bajo el marcador.
  const golesLocal = goles.filter((g: any) => g.equipo_beneficiario_id === local.id);
  const golesVisitante = goles.filter((g: any) => g.equipo_beneficiario_id === visitante.id);

  function minutoTexto(g: any) {
    return `${g.minuto}${g.minuto_extra ? `+${g.minuto_extra}` : ''}'`;
  }

  // Mapas persona_id -> eventos, para pintar iconos junto a cada nombre en la alineación
  const golesPorPersona = new Map<number, any[]>();
  for (const g of goles as any[]) {
    if (!g.autor) continue;
    const lista = golesPorPersona.get(g.autor.id) ?? [];
    lista.push(g);
    golesPorPersona.set(g.autor.id, lista);
  }
  const tarjetasPorPersona = new Map<number, any[]>();
  for (const t of tarjetas as any[]) {
    if (!t.persona) continue;
    const lista = tarjetasPorPersona.get(t.persona.id) ?? [];
    lista.push(t);
    tarjetasPorPersona.set(t.persona.id, lista);
  }

  function IconosJugador({ personaId }: { personaId: number }) {
    const gs = golesPorPersona.get(personaId) ?? [];
    const ts = tarjetasPorPersona.get(personaId) ?? [];
    if (gs.length === 0 && ts.length === 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5 ml-1">
        {gs.map((g, i) => (
          <span key={`g${i}`} title={g.tipo === 'AUTOGOL' ? `Gol en propia meta ${minutoTexto(g)}` : `Gol ${minutoTexto(g)}`}>
            {g.tipo === 'AUTOGOL' ? (
              <span className="text-red-600 font-semibold text-xs">⚽ p.p.</span>
            ) : (
              '⚽'
            )}
          </span>
        ))}
        {ts.map((t, i) => (
          <span key={`t${i}`} title={`${t.tipo} ${t.minuto}'`}>
            {t.tipo === 'AMARILLA' ? '🟨' : t.tipo === 'SEGUNDA_AMARILLA' ? '🟨🟨' : '🟥'}
          </span>
        ))}
      </span>
    );
  }

  // Hilo cronológico único de eventos (para la línea de tiempo)
  type Evento = {
    minuto: number;
    minutoExtra?: number | null;
    equipoLocalEvento: boolean;
    icono: string;
    contenido: React.ReactNode;
  };
  const eventos: Evento[] = [];

  for (const g of goles as any[]) {
    const equipoGolLocal = g.equipo_beneficiario_id === local.id;
    const esAutogol = g.tipo === 'AUTOGOL';
    eventos.push({
      minuto: g.minuto,
      minutoExtra: g.minuto_extra,
      equipoLocalEvento: equipoGolLocal,
      icono: '⚽',
      contenido: (
        <>
          <NombrePersona persona={g.autor} esCordoba={(equipoGolLocal ? local : visitante).es_cordoba} />
          {esAutogol && <span className="text-red-600 font-semibold"> (p.p.)</span>}
          {!esAutogol && g.tipo && g.tipo !== 'NORMAL' ? ` (${g.tipo.toLowerCase().replace('_', ' ')})` : ''}
        </>
      ),
    });
  }

  for (const t of tarjetas as any[]) {
    const equipoLocalT = t.equipo_id === local.id;
    const icono = t.tipo === 'AMARILLA' ? '🟨' : t.tipo === 'SEGUNDA_AMARILLA' ? '🟨🟨' : '🟥';
    eventos.push({
      minuto: t.minuto,
      equipoLocalEvento: equipoLocalT,
      icono,
      contenido: <NombrePersona persona={t.persona} esCordoba={(equipoLocalT ? local : visitante).es_cordoba} />,
    });
  }

  for (const s of sustituciones as any[]) {
    const equipoLocalS = s.equipo_id === local.id;
    const esCordobaEquipo = (equipoLocalS ? local : visitante).es_cordoba;
    eventos.push({
      minuto: s.minuto,
      equipoLocalEvento: equipoLocalS,
      icono: '🔄',
      contenido: (
        <>
          <NombrePersona persona={s.entra} esCordoba={esCordobaEquipo} /> por{' '}
          <NombrePersona persona={s.sale} esCordoba={esCordobaEquipo} />
        </>
      ),
    });
  }

  eventos.sort((a, b) => a.minuto - b.minuto || (a.minutoExtra ?? 0) - (b.minutoExtra ?? 0));

  // Orden táctico: portero, lateral derecho, centrales, lateral izquierdo, centrocampistas, delanteros.
  function ordenTactico(persona: any): number {
    const g = persona?.posicion_general;
    const e = persona?.posicion_especifica ?? '';
    if (g === 'Portero') return 1;
    if (g === 'Defensa') {
      if (e === 'Lateral derecho') return 2;
      if (e === 'Lateral izquierdo') return 4;
      return 3; // Central, o Defensa sin especificar
    }
    if (g === 'Centrocampista') return 5;
    if (g === 'Delantero') return 6;
    return 7; // Sin posición registrada, al final
  }

  function AlineacionEquipo({ lista, equipo, entrenador }: { lista: any[]; equipo: any; entrenador: any }) {
    const titulares = lista
      .filter((c) => c.participacion?.titular)
      .sort((a, b) => ordenTactico(a.persona) - ordenTactico(b.persona));
    const suplentes = lista.filter((c) => c.participacion && !c.participacion.titular);
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <EquipoBadge equipo={equipo} size="md" />
          <h3 className="font-bold text-lg">{equipo.nombre_corto}</h3>
        </div>
        <ol className="space-y-2 text-sm">
          {titulares.map((c) => (
            <li key={c.persona.id} className="flex justify-between items-center">
              <span>
                {c.dorsal != null && <span className="text-gray-400 font-mono text-xs mr-1.5">{c.dorsal}</span>}
                <NombrePersona persona={c.persona} esCordoba={equipo.es_cordoba} />
                <IconosJugador personaId={c.persona.id} />
              </span>
              {c.participacion?.minuto_sale && (
                <span className="text-gray-500 text-xs">🔻 {c.participacion.minuto_sale}&apos;</span>
              )}
            </li>
          ))}
        </ol>

        {/* Entrenador justo debajo del once titular */}
        {entrenador?.persona && (
          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
            Entrenador:{' '}
            {equipo.es_cordoba && entrenador.persona ? (
              <Link href={`/entrenadores/${entrenador.persona.slug}`} className="hover:underline">
                {entrenador.persona.nombre_mostrado}
              </Link>
            ) : (
              <NombrePersona persona={entrenador.persona} esCordoba={equipo.es_cordoba} />
            )}
          </div>
        )}

        {suplentes.length > 0 && (
          <>
            <p className="text-xs uppercase text-gray-400 mt-4 mb-1">Suplentes</p>
            <ol className="space-y-2 text-sm">
              {suplentes.map((c) => (
                <li key={c.persona.id} className="flex justify-between items-center text-gray-600">
                  <span>
                    {c.dorsal != null && <span className="text-gray-400 font-mono text-xs mr-1.5">{c.dorsal}</span>}
                    <NombrePersona persona={c.persona} esCordoba={equipo.es_cordoba} />
                    <IconosJugador personaId={c.persona.id} />
                  </span>
                  {c.participacion?.minuto_entra && (
                    <span className="text-xs">🔺 {c.participacion.minuto_entra}&apos;</span>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-center gap-8 text-center">
          <div className="flex-1 flex items-center justify-end gap-4">
            <span className="font-semibold text-lg">{local.nombre_corto}</span>
            <EquipoBadge equipo={local} size="md" />
          </div>
          <div className="text-5xl font-bold shrink-0">
            {partido.goles_local} - {partido.goles_visitante}
          </div>
          <div className="flex-1 flex items-center justify-start gap-4">
            <EquipoBadge equipo={visitante} size="md" />
            <span className="font-semibold text-lg">{visitante.nombre_corto}</span>
          </div>
        </div>

        {/* Goleadores con minutos, justo bajo el marcador */}
        {(golesLocal.length > 0 || golesVisitante.length > 0) && (
          <div className="mt-4 flex justify-center gap-16 text-sm text-gray-600">
            <div className="text-right">
              {golesLocal.map((g: any, i: number) => (
                <div key={i}>
                  ⚽ {g.autor?.nombre_mostrado ?? '?'} {minutoTexto(g)}
                  {g.tipo === 'AUTOGOL' && <span className="text-red-600 font-semibold"> (p.p.)</span>}
                </div>
              ))}
            </div>
            <div className="text-left">
              {golesVisitante.map((g: any, i: number) => (
                <div key={i}>
                  ⚽ {g.autor?.nombre_mostrado ?? '?'} {minutoTexto(g)}
                  {g.tipo === 'AUTOGOL' && <span className="text-red-600 font-semibold"> (p.p.)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-center border-t pt-4">
          <div>
            <div className="text-gray-400 text-xs uppercase">Fecha</div>
            <div className="capitalize">{formatFecha(partido.fecha)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase">Competición</div>
            <div>
              {edicion?.competicion?.nombre_actual}
              {partido.jornada ? ` · Jornada ${partido.jornada}` : ''}
              <br />
              <Link href={`/temporadas/${edicion?.temporada?.etiqueta}`} className="underline">
                Temporada {edicion?.temporada?.etiqueta}
              </Link>
            </div>
          </div>
          {estadio && (
            <div>
              <div className="text-gray-400 text-xs uppercase">Estadio</div>
              <div>{estadio.nombre}</div>
            </div>
          )}
          {arbitro?.persona && (
            <div>
              <div className="text-gray-400 text-xs uppercase">Árbitro</div>
              <div>{arbitro.persona.nombre_mostrado}</div>
            </div>
          )}
        </div>
      </div>

      {/* Alineaciones — protagonistas de la página */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h2 className="font-bold text-xl mb-6">Alineaciones</h2>
        {!hayAlgunaAlineacion && <p className="text-gray-400 text-sm">No se conserva alineación de este partido.</p>}
        {hayAlgunaAlineacion && !hayAmbasAlineaciones && (
          <p className="text-sm text-gray-500 bg-gray-50 rounded p-2 mb-4">
            Solo se conserva la alineación de {convLocal.length > 0 ? local.nombre_corto : visitante.nombre_corto} para
            este partido.
          </p>
        )}
        <div className={hayAmbasAlineaciones ? 'grid md:grid-cols-2 gap-12' : ''}>
          {convLocal.length > 0 && (
            <AlineacionEquipo lista={convLocal} equipo={local} entrenador={entrenadorLocal} />
          )}
          {convVisitante.length > 0 && (
            <AlineacionEquipo lista={convVisitante} equipo={visitante} entrenador={entrenadorVisitante} />
          )}
        </div>
      </div>

      {/* Eventos — en filas que se ajustan al ancho, sin scroll */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h2 className="font-bold text-lg mb-4">Eventos del partido</h2>
        {eventos.length === 0 && <p className="text-gray-400 text-sm">No hay eventos registrados.</p>}
        {eventos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {eventos.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-gray-400 text-xs w-8">
                  {e.minuto}
                  {e.minutoExtra ? `+${e.minutoExtra}` : ''}&apos;
                </span>
                <EquipoBadge equipo={e.equipoLocalEvento ? local : visitante} />
                <span>{e.icono}</span>
                <span>{e.contenido}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
