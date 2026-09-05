// @ts-nocheck
import { supabase } from './supabase';

export async function getPartidoBySlug(slug: string) {
  const { data: partido, error } = await supabase
    .from('partidos')
    .select(
      `
      id, fecha, slug, goles_local, goles_visitante, jornada,
      equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre_corto, es_cordoba, escudo_url),
      equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre_corto, es_cordoba, escudo_url),
      estadio:estadios(id, nombre),
      edicion:ediciones_competicion(
        id,
        temporada:temporadas(id, etiqueta),
        competicion:competiciones(id, nombre_actual)
      )
    `
    )
    .eq('slug', slug)
    .single();

  if (error || !partido) return null;

  const [{ data: arbitros }, { data: entrenadores }, { data: convocatorias }, { data: goles }, { data: tarjetas }, { data: sustituciones }] =
    await Promise.all([
      supabase
        .from('partido_arbitros')
        .select('rol, persona:personas(id, nombre_mostrado, slug)')
        .eq('partido_id', partido.id),
      supabase
        .from('partido_entrenadores')
        .select('equipo_id, persona:personas(id, nombre_mostrado, slug)')
        .eq('partido_id', partido.id),
      supabase
        .from('convocatorias')
        .select(
          `equipo_id, jugo, dorsal, persona:personas(id, nombre_mostrado, slug),
           participacion:participaciones(titular, minuto_entra, minuto_sale)`
        )
        .eq('partido_id', partido.id),
      supabase
        .from('goles')
        .select(
          `minuto, minuto_extra, tipo, equipo_beneficiario_id,
           autor:personas!goles_autor_id_fkey(id, nombre_mostrado, slug)`
        )
        .eq('partido_id', partido.id)
        .order('minuto'),
      supabase
        .from('tarjetas')
        .select('minuto, tipo, equipo_id, persona:personas(id, nombre_mostrado, slug)')
        .eq('partido_id', partido.id),
      supabase
        .from('sustituciones')
        .select(
          `minuto, equipo_id,
           sale:personas!sustituciones_sale_persona_id_fkey(id, nombre_mostrado, slug),
           entra:personas!sustituciones_entra_persona_id_fkey(id, nombre_mostrado, slug)`
        )
        .eq('partido_id', partido.id),
    ]);

  return {
    partido,
    arbitros: arbitros ?? [],
    entrenadores: entrenadores ?? [],
    convocatorias: convocatorias ?? [],
    goles: goles ?? [],
    tarjetas: tarjetas ?? [],
    sustituciones: sustituciones ?? [],
  };
}

const CORDOBA_ID = 74;

export async function getJugadorBySlug(slug: string) {
  const { data: persona, error } = await supabase.from('personas').select('*').eq('slug', slug).single();

  if (error || !persona) return null;

  // Todas sus convocatorias con el Córdoba, con el partido, el resultado y la temporada/competición.
  const { data: convocatorias } = await supabase
    .from('convocatorias')
    .select(
      `jugo, dorsal,
       participacion:participaciones(titular, minuto_entra, minuto_sale),
       partido:partidos(id, fecha, slug, goles_local, goles_visitante,
         equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre_corto),
         equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre_corto),
         edicion:ediciones_competicion(temporada:temporadas(etiqueta), competicion:competiciones(nombre_actual))
       )`
    )
    .eq('persona_id', persona.id)
    .eq('equipo_id', CORDOBA_ID);

  const { data: goles } = await supabase
    .from('goles')
    .select(
      `minuto, minuto_extra, tipo,
       partido:partidos(id, fecha, slug,
         equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre_corto),
         equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre_corto),
         edicion:ediciones_competicion(temporada:temporadas(etiqueta), competicion:competiciones(nombre_actual)))`
    )
    .eq('autor_id', persona.id);

  const { data: tarjetas } = await supabase
    .from('tarjetas')
    .select(
      'tipo, partido:partidos(id, fecha, edicion:ediciones_competicion(temporada:temporadas(etiqueta), competicion:competiciones(nombre_actual)))'
    )
    .eq('persona_id', persona.id)
    .eq('equipo_id', CORDOBA_ID);

  // Ranking histórico ("#N en la historia") usando las vistas agregadas —
  // así no hay que traer a los 946 jugadores en cada carga de página.
  const { data: misPartidos } = await supabase
    .from('v_jugador_partidos')
    .select('partidos')
    .eq('persona_id', persona.id)
    .maybeSingle();
  const { data: misGoles } = await supabase
    .from('v_jugador_goles')
    .select('goles')
    .eq('persona_id', persona.id)
    .maybeSingle();

  let rankingPartidos: number | null = null;
  if (misPartidos?.partidos) {
    const { count } = await supabase
      .from('v_jugador_partidos')
      .select('*', { count: 'exact', head: true })
      .gt('partidos', misPartidos.partidos);
    rankingPartidos = (count ?? 0) + 1;
  }

  let rankingGoles: number | null = null;
  if (misGoles?.goles) {
    const { count } = await supabase
      .from('v_jugador_goles')
      .select('*', { count: 'exact', head: true })
      .gt('goles', misGoles.goles);
    rankingGoles = (count ?? 0) + 1;
  }

  // Compañeros: partidos en los que jugó, y quién más jugó en esos mismos partidos.
  const partidoIds = (convocatorias ?? [])
    .filter((c: any) => c.jugo && c.partido)
    .map((c: any) => c.partido.id);

  // Entrenadores con los que coincidió — mismo conjunto de partidos, tabla distinta.
  let entrenadores: { persona_id: number; nombre_mostrado: string; slug: string; partidos: number }[] = [];
  if (partidoIds.length > 0) {
    const filasEntrenador: any[] = [];
    const PAGE_E = 1000;
    let desdeE = 0;
    while (true) {
      const { data: pagina } = await supabase
        .from('partido_entrenadores')
        .select('persona:personas(id, nombre_mostrado, slug)')
        .eq('equipo_id', CORDOBA_ID)
        .in('partido_id', partidoIds)
        .order('partido_id', { ascending: true })
        .order('persona_id', { ascending: true })
        .range(desdeE, desdeE + PAGE_E - 1);
      if (!pagina || pagina.length === 0) break;
      filasEntrenador.push(...pagina);
      if (pagina.length < PAGE_E) break;
      desdeE += PAGE_E;
    }
    const conteoE = new Map<number, { nombre_mostrado: string; slug: string; partidos: number }>();
    for (const row of filasEntrenador) {
      const p: any = (row as any).persona;
      if (!p) continue;
      const actual = conteoE.get(p.id) ?? { nombre_mostrado: p.nombre_mostrado, slug: p.slug, partidos: 0 };
      actual.partidos += 1;
      conteoE.set(p.id, actual);
    }
    entrenadores = Array.from(conteoE.entries())
      .map(([persona_id, v]) => ({ persona_id, ...v }))
      .sort((a, b) => b.partidos - a.partidos);
  }

  let companeros: { persona_id: number; nombre_mostrado: string; slug: string; partidos: number }[] = [];
  if (partidoIds.length > 0) {
    // Supabase limita cada respuesta a 1000 filas por defecto. Con jugadores de
    // muchos partidos (300+) el cruce con todos sus compañeros supera ese límite
    // fácilmente, así que paginamos hasta traer todas las filas sin cortes.
    const otrasConv: any[] = [];
    const PAGE = 1000;
    let desde = 0;
    while (true) {
      const { data: pagina } = await supabase
        .from('convocatorias')
        .select('persona_id, jugo, partido_id, persona:personas(id, nombre_mostrado, slug)')
        .eq('equipo_id', CORDOBA_ID)
        .eq('jugo', true)
        .in('partido_id', partidoIds)
        .neq('persona_id', persona.id)
        .order('partido_id', { ascending: true })
        .order('persona_id', { ascending: true })
        .range(desde, desde + PAGE - 1);
      if (!pagina || pagina.length === 0) break;
      otrasConv.push(...pagina);
      if (pagina.length < PAGE) break;
      desde += PAGE;
    }

    const conteo = new Map<number, { nombre_mostrado: string; slug: string; partidos: number }>();
    for (const row of otrasConv) {
      const p: any = (row as any).persona;
      if (!p) continue;
      const actual = conteo.get(p.id) ?? { nombre_mostrado: p.nombre_mostrado, slug: p.slug, partidos: 0 };
      actual.partidos += 1;
      conteo.set(p.id, actual);
    }
    companeros = Array.from(conteo.entries())
      .map(([persona_id, v]) => ({ persona_id, ...v }))
      .sort((a, b) => b.partidos - a.partidos)
      .slice(0, 7);
  }

  const { count: partidosComoEntrenador } = await supabase
    .from('partido_entrenadores')
    .select('*', { count: 'exact', head: true })
    .eq('equipo_id', CORDOBA_ID)
    .eq('persona_id', persona.id);
  const esTambienEntrenador = (partidosComoEntrenador ?? 0) > 0;

  return {
    persona,
    convocatorias: convocatorias ?? [],
    goles: goles ?? [],
    tarjetas: tarjetas ?? [],
    companeros,
    esTambienEntrenador,
    entrenadores,
    rankingPartidos,
    rankingGoles,
  };
}

export async function getJugadoresListado() {
  // Traemos partidos y goles de todos los jugadores desde las vistas agregadas,
  // y cruzamos con datos básicos de personas. Paginamos porque hay ~950 jugadores.
  const filas: any[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data: pagina } = await supabase
      .from('v_jugador_partidos')
      .select('persona_id, partidos, titularidades')
      .order('partidos', { ascending: false })
      .order('persona_id', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (!pagina || pagina.length === 0) break;
    filas.push(...pagina);
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }

  const ids = filas.map((f) => f.persona_id);
  const { data: personasData } = await supabase
    .from('personas')
    .select('id, nombre_mostrado, slug, posicion_general, posicion_especifica, foto_url')
    .in('id', ids);

  const { data: golesData } = await supabase.from('v_jugador_goles').select('persona_id, goles').in('persona_id', ids);

  // Goles encajados — solo tiene sentido para porteros, pero la vista los calcula para todos.
  const { data: encajadosData } = await supabase.from('v_jugador_encajados').select('persona_id, encajados').in('persona_id', ids);

  const personasPorId = new Map((personasData ?? []).map((p: any) => [p.id, p]));
  const golesPorId = new Map((golesData ?? []).map((g: any) => [g.persona_id, g.goles]));
  const encajadosPorId = new Map((encajadosData ?? []).map((e: any) => [e.persona_id, e.encajados]));

  return filas
    .map((f) => {
      const persona: any = personasPorId.get(f.persona_id);
      if (!persona) return null;
      return {
        id: persona.id,
        nombre_mostrado: persona.nombre_mostrado,
        slug: persona.slug,
        posicion_general: persona.posicion_general,
        posicion_especifica: persona.posicion_especifica,
        foto_url: persona.foto_url,
        partidos: f.partidos,
        titularidades: f.titularidades,
        goles: golesPorId.get(f.persona_id) ?? 0,
        golesEncajados: encajadosPorId.get(f.persona_id) ?? 0,
      };
    })
    .filter(Boolean);
}

const NOMBRE_COPA = /copa/i;

export async function getTemporadaByEtiqueta(etiqueta: string) {
  const { data: temporada, error } = await supabase.from('temporadas').select('id, etiqueta').eq('etiqueta', etiqueta).single();
  if (error || !temporada) return null;

  // Primero, qué ediciones de competición corresponden a esta temporada (Liga, Copa, Playoff...)
  const { data: ediciones } = await supabase
    .from('ediciones_competicion')
    .select('id, ascensos, descensos, puesto_final, resultado_cordoba, competicion:competiciones(id, nombre_actual)')
    .eq('temporada_id', temporada.id);

  const edicionIds = (ediciones ?? []).map((e: any) => e.id);
  const edicionPorId = new Map((ediciones ?? []).map((e: any) => [e.id, e]));

  if (edicionIds.length === 0) {
    return {
      temporada,
      partidos: [],
      competiciones: [],
      resumen: { partidos: 0, victorias: 0, empates: 0, derrotas: 0, golesFavor: 0, golesContra: 0, rachaInvictoMax: 0, rachaVictoriasMax: 0 },
      plantilla: [],
      maximoGoleador: null,
    };
  }

  // Todos los partidos del Córdoba en esas ediciones
  const { data: partidosRaw } = await supabase
    .from('partidos')
    .select(
      `id, fecha, slug, goles_local, goles_visitante, jornada, edicion_id,
       equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre_corto),
       equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre_corto)`
    )
    .in('edicion_id', edicionIds)
    .order('fecha');

  const CORDOBA_ID = 74;
  const partidosTemporada = (partidosRaw ?? []).filter(
    (p: any) => p.equipo_local?.id === CORDOBA_ID || p.equipo_visitante?.id === CORDOBA_ID
  );

  const partidoIds = partidosTemporada.map((p: any) => p.id);

  // Agrupar por competición (edición) dentro de la temporada
  type CompStats = {
    edicionId: number;
    nombre: string;
    ascensos: number | null;
    descensos: number | null;
    puestoFinal: number | null;
    resultadoCordoba: string | null;
    partidos: number;
    victorias: number;
    empates: number;
    derrotas: number;
    golesFavor: number;
    golesContra: number;
  };
  const porCompeticion = new Map<number, CompStats>();

  let victoriasTotal = 0,
    empatesTotal = 0,
    derrotasTotal = 0,
    golesFavorTotal = 0,
    golesContraTotal = 0;

  const partidosOrdenados = [...partidosTemporada].sort(
    (a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  // Rachas: se calculan sobre el orden cronológico real (todas las competiciones mezcladas)
  let rachaInvictoActual = 0,
    rachaInvictoMax = 0;
  let rachaVictoriasActual = 0,
    rachaVictoriasMax = 0;

  for (const p of partidosOrdenados) {
    const cordobaEsLocal = p.equipo_local.id === CORDOBA_ID;
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;

    const edicion: any = edicionPorId.get(p.edicion_id);
    const compId = p.edicion_id;
    if (!porCompeticion.has(compId)) {
      porCompeticion.set(compId, {
        edicionId: compId,
        nombre: edicion.competicion?.nombre_actual ?? 'Competición',
        ascensos: edicion.ascensos,
        descensos: edicion.descensos,
        puestoFinal: edicion.puesto_final,
        resultadoCordoba: edicion.resultado_cordoba,
        partidos: 0,
        victorias: 0,
        empates: 0,
        derrotas: 0,
        golesFavor: 0,
        golesContra: 0,
      });
    }
    const cs = porCompeticion.get(compId)!;
    cs.partidos += 1;

    if (golesCordoba != null && golesRival != null) {
      cs.golesFavor += golesCordoba;
      cs.golesContra += golesRival;
      golesFavorTotal += golesCordoba;
      golesContraTotal += golesRival;

      if (golesCordoba > golesRival) {
        cs.victorias += 1;
        victoriasTotal += 1;
        rachaInvictoActual += 1;
        rachaVictoriasActual += 1;
      } else if (golesCordoba === golesRival) {
        cs.empates += 1;
        empatesTotal += 1;
        rachaInvictoActual += 1;
        rachaVictoriasActual = 0;
      } else {
        cs.derrotas += 1;
        derrotasTotal += 1;
        rachaInvictoActual = 0;
        rachaVictoriasActual = 0;
      }
      rachaInvictoMax = Math.max(rachaInvictoMax, rachaInvictoActual);
      rachaVictoriasMax = Math.max(rachaVictoriasMax, rachaVictoriasActual);
    }
  }

  // Plantilla de la temporada: todos los jugadores del Córdoba que jugaron algún partido
  let plantilla: any[] = [];
  if (partidoIds.length > 0) {
    const filas: any[] = [];
    const PAGE = 1000;
    let desde = 0;
    while (true) {
      const { data: pagina } = await supabase
        .from('convocatorias')
        .select(
          `persona_id, jugo, dorsal, partido_id, persona:personas(id, nombre_mostrado, slug, posicion_general, posicion_especifica),
           participacion:participaciones(titular)`
        )
        .eq('equipo_id', CORDOBA_ID)
        .eq('jugo', true)
        .in('partido_id', partidoIds)
        .order('partido_id', { ascending: true })
        .order('persona_id', { ascending: true })
        .range(desde, desde + PAGE - 1);
      if (!pagina || pagina.length === 0) break;
      filas.push(...pagina);
      if (pagina.length < PAGE) break;
      desde += PAGE;
    }

    const { data: golesTemporada } = await supabase
      .from('goles')
      .select('autor_id')
      .eq('equipo_beneficiario_id', CORDOBA_ID)
      .in('partido_id', partidoIds);
    const { data: tarjetasTemporada } = await supabase
      .from('tarjetas')
      .select('persona_id')
      .eq('equipo_id', CORDOBA_ID)
      .in('partido_id', partidoIds);

    const golesPorPersona = new Map<number, number>();
    for (const g of golesTemporada ?? []) {
      if (!g.autor_id) continue;
      golesPorPersona.set(g.autor_id, (golesPorPersona.get(g.autor_id) ?? 0) + 1);
    }
    const tarjetasPorPersona = new Map<number, number>();
    for (const t of tarjetasTemporada ?? []) {
      tarjetasPorPersona.set(t.persona_id, (tarjetasPorPersona.get(t.persona_id) ?? 0) + 1);
    }

    // Orden cronológico real de los partidos, para saber cuál es el dorsal "más reciente"
    // de cada jugador (puede cambiar de número a mitad de temporada).
    const ordenPartido = new Map(partidosOrdenados.map((p: any, i: number) => [p.id, i]));

    const porJugador = new Map<number, any>();
    const ultimoOrdenDorsal = new Map<number, number>();
    for (const f of filas) {
      const p: any = f.persona;
      if (!p) continue;
      const actual = porJugador.get(p.id) ?? {
        id: p.id,
        nombre_mostrado: p.nombre_mostrado,
        slug: p.slug,
        posicion_general: p.posicion_general,
        posicion_especifica: p.posicion_especifica,
        partidos: 0,
        titularidades: 0,
        dorsal: null as number | null,
      };
      actual.partidos += 1;
      if (f.participacion?.titular) actual.titularidades += 1;
      if (f.dorsal != null) {
        const orden = ordenPartido.get(f.partido_id) ?? -1;
        if (orden >= (ultimoOrdenDorsal.get(p.id) ?? -1)) {
          actual.dorsal = f.dorsal;
          ultimoOrdenDorsal.set(p.id, orden);
        }
      }
      porJugador.set(p.id, actual);
    }

    plantilla = Array.from(porJugador.values())
      .map((j) => ({ ...j, goles: golesPorPersona.get(j.id) ?? 0, tarjetas: tarjetasPorPersona.get(j.id) ?? 0 }))
      .sort((a, b) => b.partidos - a.partidos);
  }

  const maximoGoleador = [...plantilla].sort((a, b) => b.goles - a.goles)[0];
  const maximoGoleadorValido = maximoGoleador && maximoGoleador.goles > 0 ? maximoGoleador : null;

  return {
    temporada,
    partidos: partidosOrdenados,
    competiciones: Array.from(porCompeticion.values()),
    resumen: {
      partidos: partidosTemporada.length,
      victorias: victoriasTotal,
      empates: empatesTotal,
      derrotas: derrotasTotal,
      golesFavor: golesFavorTotal,
      golesContra: golesContraTotal,
      rachaInvictoMax,
      rachaVictoriasMax,
    },
    plantilla,
    maximoGoleador: maximoGoleadorValido,
  };
}

// ---------------------------------------------------------------------------
// HOME
// ---------------------------------------------------------------------------

async function pickRandomOffset(count: number) {
  if (count <= 0) return 0;
  return Math.floor(Math.random() * count);
}

async function getStatsGlobales() {
  const [{ count: totalPartidos }, { count: totalJugadores }, { count: golesCordoba }] = await Promise.all([
    supabase
      .from('partidos')
      .select('*', { count: 'exact', head: true })
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`),
    supabase.from('v_jugador_partidos').select('*', { count: 'exact', head: true }),
    supabase.from('goles').select('*', { count: 'exact', head: true }).eq('equipo_beneficiario_id', CORDOBA_ID),
  ]);

  // Paginado sin JOIN (los JOINs sobre ~2976 filas paginadas pueden provocar timeout,
  // como pasó antes con efemérides/rivales). Traemos solo edicion_id y resolvemos
  // temporada_id aparte con una consulta pequeña.
  const edicionIds: number[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data: pagina, error } = await supabase
      .from('partidos')
      .select('id, edicion_id')
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .order('id', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (error || !pagina || pagina.length === 0) break;
    edicionIds.push(...pagina.map((p: any) => p.edicion_id).filter((x: any) => x != null));
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }
  const edicionIdsUnicos = Array.from(new Set(edicionIds));
  const { data: edicionesData } = await supabase
    .from('ediciones_competicion')
    .select('id, temporada_id')
    .in('id', edicionIdsUnicos);
  const temporadasUnicas = new Set((edicionesData ?? []).map((e: any) => e.temporada_id).filter(Boolean));

  return {
    partidos: totalPartidos ?? 0,
    jugadores: totalJugadores ?? 0,
    goles: golesCordoba ?? 0,
    temporadas: temporadasUnicas.size,
  };
}

async function getUltimoPartidoHome() {
  const { data } = await supabase
    .from('partidos')
    .select('slug')
    .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
    .not('goles_local', 'is', null)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.slug) return null;
  const partido = await getPartidoBySlug(data.slug);
  if (!partido) return null;

  const golesLocal = partido.goles.filter((g: any) => g.equipo_beneficiario_id === partido.partido.equipo_local.id);
  const golesVisitante = partido.goles.filter(
    (g: any) => g.equipo_beneficiario_id === partido.partido.equipo_visitante.id
  );

  return {
    slug: data.slug,
    fecha: partido.partido.fecha,
    local: partido.partido.equipo_local,
    visitante: partido.partido.equipo_visitante,
    golesLocalNum: partido.partido.goles_local,
    golesVisitanteNum: partido.partido.goles_visitante,
    competicion: partido.partido.edicion?.competicion?.nombre_actual ?? null,
    temporada: partido.partido.edicion?.temporada?.etiqueta ?? null,
    estadio: partido.partido.estadio?.nombre ?? null,
    goleadoresLocal: golesLocal.map((g: any) => g.autor?.nombre_mostrado).filter(Boolean),
    goleadoresVisitante: golesVisitante.map((g: any) => g.autor?.nombre_mostrado).filter(Boolean),
  };
}

async function getEfemeridesHoy() {
  const hoy = new Date();
  const mmdd = `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // Traemos solo columnas ligeras (sin JOINs) para toda la paginación, ya que
  // los JOINs a equipos/ediciones sobre las ~3000 filas provocaban timeout.
  // Filtramos por mes/día en JS porque PostgREST no permite comparar solo esa parte de una fecha.
  const filas: any[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data: pagina, error } = await supabase
      .from('partidos')
      .select('id, fecha, slug, goles_local, goles_visitante, equipo_local_id, equipo_visitante_id, edicion_id')
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .not('goles_local', 'is', null)
      .order('id', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (error || !pagina || pagina.length === 0) break;
    filas.push(...pagina);
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }

  const coincidencias = filas.filter((p: any) => {
    const f = new Date(p.fecha + 'T00:00:00');
    const pmmdd = `${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    return pmmdd === mmdd;
  });

  coincidencias.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const top3 = coincidencias.slice(0, 3);
  if (top3.length === 0) return [];

  // Solo para las 1-3 coincidencias finales, traemos los datos completos (equipos, temporada).
  const equipoIds = Array.from(new Set(top3.flatMap((p: any) => [p.equipo_local_id, p.equipo_visitante_id])));
  const edicionIds = Array.from(new Set(top3.map((p: any) => p.edicion_id).filter(Boolean)));

  const [{ data: equiposData }, { data: edicionesData }] = await Promise.all([
    supabase.from('equipos').select('id, nombre_corto').in('id', equipoIds),
    edicionIds.length > 0
      ? supabase.from('ediciones_competicion').select('id, temporada:temporadas(etiqueta)').in('id', edicionIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const equiposPorId = new Map((equiposData ?? []).map((e: any) => [e.id, e]));
  const edicionesPorId = new Map((edicionesData ?? []).map((e: any) => [e.id, e]));

  return top3.map((p: any) => {
    const cordobaEsLocal = p.equipo_local_id === CORDOBA_ID;
    const rivalId = cordobaEsLocal ? p.equipo_visitante_id : p.equipo_local_id;
    const rival = equiposPorId.get(rivalId);
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;
    return {
      slug: p.slug,
      fecha: p.fecha,
      rival: rival?.nombre_corto ?? '?',
      golesCordoba,
      golesRival,
      temporada: edicionesPorId.get(p.edicion_id)?.temporada?.etiqueta ?? null,
    };
  });
}

async function getJugadorDestacadoHome() {
  const { data: candidatos } = await supabase
    .from('v_jugador_partidos')
    .select('persona_id')
    .gte('partidos', 20);

  if (!candidatos || candidatos.length === 0) return null;
  const elegido = candidatos[await pickRandomOffset(candidatos.length)];

  const { data: persona } = await supabase
    .from('personas')
    .select('id, nombre_mostrado, slug, foto_url, posicion_general, posicion_especifica')
    .eq('id', elegido.persona_id)
    .single();
  if (!persona) return null;

  const { data: partidosRow } = await supabase
    .from('v_jugador_partidos')
    .select('partidos')
    .eq('persona_id', persona.id)
    .maybeSingle();
  const { data: golesRow } = await supabase
    .from('v_jugador_goles')
    .select('goles')
    .eq('persona_id', persona.id)
    .maybeSingle();

  const { data: convocatorias } = await supabase
    .from('convocatorias')
    .select('partido:partidos(edicion:ediciones_competicion(temporada_id))')
    .eq('persona_id', persona.id)
    .eq('equipo_id', CORDOBA_ID)
    .eq('jugo', true);

  const temporadasUnicas = new Set(
    (convocatorias ?? []).map((c: any) => c.partido?.edicion?.temporada_id).filter(Boolean)
  );

  let rankingPartidos: number | null = null;
  if (partidosRow?.partidos) {
    const { count } = await supabase
      .from('v_jugador_partidos')
      .select('*', { count: 'exact', head: true })
      .gt('partidos', partidosRow.partidos);
    rankingPartidos = (count ?? 0) + 1;
  }

  return {
    nombre_mostrado: persona.nombre_mostrado,
    slug: persona.slug,
    foto_url: persona.foto_url,
    posicion: persona.posicion_general,
    partidos: partidosRow?.partidos ?? 0,
    goles: golesRow?.goles ?? 0,
    temporadas: temporadasUnicas.size,
    rankingPartidos,
  };
}

async function getRecordHistoricoHome() {
  const { data: top } = await supabase
    .from('v_jugador_goles')
    .select('persona_id, goles')
    .order('goles', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!top) return null;

  const { data: persona } = await supabase
    .from('personas')
    .select('nombre_mostrado, slug')
    .eq('id', top.persona_id)
    .single();
  if (!persona) return null;

  return { nombre_mostrado: persona.nombre_mostrado, slug: persona.slug, goles: top.goles };
}

async function getTemporadaDestacadaHome() {
  const { data: temporadas } = await supabase.from('temporadas').select('id, etiqueta');
  if (!temporadas || temporadas.length === 0) return null;

  // Solo elegimos entre temporadas donde el Córdoba realmente jugó.
  // Paginado: sin range(), la consulta se trunca a las primeras ~1000 de 2976 filas.
  const idsTemporadaPartidos: (number | null)[] = [];
  {
    const PAGE = 1000;
    let desde = 0;
    while (true) {
      const { data: pagina, error } = await supabase
        .from('partidos')
        .select('id, edicion:ediciones_competicion(temporada_id)')
        .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
        .order('id', { ascending: true })
        .range(desde, desde + PAGE - 1);
      if (error || !pagina || pagina.length === 0) break;
      idsTemporadaPartidos.push(...pagina.map((p: any) => p.edicion?.temporada_id ?? null));
      if (pagina.length < PAGE) break;
      desde += PAGE;
    }
  }
  const idsConPartidos = new Set(idsTemporadaPartidos.filter(Boolean));
  const elegibles = temporadas.filter((t: any) => idsConPartidos.has(t.id));
  if (elegibles.length === 0) return null;

  const elegida = elegibles[await pickRandomOffset(elegibles.length)];
  const datos = await getTemporadaByEtiqueta(elegida.etiqueta);
  if (!datos || datos.partidos.length === 0) return null;

  const competicionesLiga = datos.competiciones.filter((c: any) => !/copa/i.test(c.nombre));
  const puesto = competicionesLiga.find((c: any) => c.puestoFinal)?.puestoFinal ?? null;
  const nombreCompeticion = competicionesLiga[0]?.nombre ?? datos.competiciones[0]?.nombre ?? null;

  return {
    etiqueta: elegida.etiqueta,
    competicion: nombreCompeticion,
    puesto,
    partidos: datos.resumen.partidos,
    victorias: datos.resumen.victorias,
    goles: datos.resumen.golesFavor,
  };
}

async function getRivalesTopHome(limite = 5) {
  const filas: any[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data: pagina, error } = await supabase
      .from('partidos')
      .select('id, goles_local, goles_visitante, equipo_local_id, equipo_visitante_id')
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .order('id', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (error || !pagina || pagina.length === 0) break;
    filas.push(...pagina);
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }
  const partidos = filas;

  type Fila = { id: number; pj: number; v: number; e: number; d: number };
  const porRival = new Map<number, Fila>();

  for (const p of partidos ?? []) {
    const cordobaEsLocal = p.equipo_local_id === CORDOBA_ID;
    const rivalId = cordobaEsLocal ? p.equipo_visitante_id : p.equipo_local_id;
    if (!rivalId || rivalId === CORDOBA_ID) continue;
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;

    const actual = porRival.get(rivalId) ?? { id: rivalId, pj: 0, v: 0, e: 0, d: 0 };
    actual.pj += 1;
    if (golesCordoba != null && golesRival != null) {
      if (golesCordoba > golesRival) actual.v += 1;
      else if (golesCordoba === golesRival) actual.e += 1;
      else actual.d += 1;
    }
    porRival.set(rivalId, actual);
  }

  const topRivales = Array.from(porRival.values())
    .sort((a, b) => b.pj - a.pj)
    .slice(0, limite);

  if (topRivales.length === 0) return [];

  const { data: equiposData } = await supabase
    .from('equipos')
    .select('id, nombre_corto, slug, escudo_url')
    .in('id', topRivales.map((r) => r.id));
  const equiposPorId = new Map((equiposData ?? []).map((e: any) => [e.id, e]));

  return topRivales.map((r) => {
    const equipo = equiposPorId.get(r.id);
    return {
      id: r.id,
      nombre: equipo?.nombre_corto ?? '?',
      slug: equipo?.slug ?? null,
      escudo: equipo?.escudo_url ?? null,
      pj: r.pj,
      v: r.v,
      e: r.e,
      d: r.d,
    };
  });
}

async function getAleatoriosHome() {
  const [{ count: totalPartidos }, { count: totalJugadores }, { count: totalTemporadas }] = await Promise.all([
    supabase
      .from('partidos')
      .select('*', { count: 'exact', head: true })
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .not('goles_local', 'is', null),
    supabase.from('v_jugador_partidos').select('*', { count: 'exact', head: true }),
    supabase.from('temporadas').select('*', { count: 'exact', head: true }),
  ]);

  const [partidoAlea, jugadorAlea, temporadaAlea] = await Promise.all([
    supabase
      .from('partidos')
      .select('slug')
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .not('goles_local', 'is', null)
      .range(await pickRandomOffset(totalPartidos ?? 1), await pickRandomOffset(totalPartidos ?? 1))
      .limit(1)
      .maybeSingle(),
    (async () => {
      const { data: ids } = await supabase.from('v_jugador_partidos').select('persona_id');
      if (!ids || ids.length === 0) return { data: null };
      const elegido = ids[await pickRandomOffset(ids.length)];
      return supabase.from('personas').select('slug').eq('id', elegido.persona_id).maybeSingle();
    })(),
    supabase
      .from('temporadas')
      .select('etiqueta')
      .range(await pickRandomOffset(totalTemporadas ?? 1), await pickRandomOffset(totalTemporadas ?? 1))
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    partidoSlug: partidoAlea.data?.slug ?? null,
    jugadorSlug: (jugadorAlea as any).data?.slug ?? null,
    temporadaEtiqueta: temporadaAlea.data?.etiqueta ?? null,
  };
}

async function getCoberturaHome() {
  const [
    { count: totalPartidos },
    { count: partidosConAlineacion },
    { count: golesConAutor },
    { count: golesTotales },
    { count: tarjetasTotales },
    { count: sustitucionesTotales },
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select('*', { count: 'exact', head: true })
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`),
    supabase
      .from('convocatorias')
      .select('partido_id', { count: 'exact', head: true })
      .eq('equipo_id', CORDOBA_ID)
      .eq('jugo', true),
    supabase.from('goles').select('*', { count: 'exact', head: true }).not('autor_id', 'is', null),
    supabase.from('goles').select('*', { count: 'exact', head: true }),
    supabase.from('tarjetas').select('*', { count: 'exact', head: true }),
    supabase.from('sustituciones').select('*', { count: 'exact', head: true }),
  ]);

  return {
    partidosRegistrados: totalPartidos ?? 0,
    porcentajeGoleadores: golesTotales ? Math.round(((golesConAutor ?? 0) / golesTotales) * 100) : null,
    eventosRegistrados: (golesTotales ?? 0) + (tarjetasTotales ?? 0) + (sustitucionesTotales ?? 0),
  };
}

export async function getListadoTemporadas() {
  const { data: temporadas } = await supabase.from('temporadas').select('id, etiqueta').order('etiqueta', { ascending: false });
  const { data: partidos } = await supabase
    .from('partidos')
    .select('edicion:ediciones_competicion(temporada_id, competicion:competiciones(nombre_actual))')
    .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`);

  const porTemporada = new Map<number, { partidos: number; competiciones: Set<string> }>();
  for (const p of partidos ?? []) {
    const tid = (p as any).edicion?.temporada_id;
    if (!tid) continue;
    const actual = porTemporada.get(tid) ?? { partidos: 0, competiciones: new Set<string>() };
    actual.partidos += 1;
    const nombreComp = (p as any).edicion?.competicion?.nombre_actual;
    if (nombreComp) actual.competiciones.add(nombreComp);
    porTemporada.set(tid, actual);
  }

  return (temporadas ?? [])
    .filter((t: any) => porTemporada.has(t.id))
    .map((t: any) => ({
      etiqueta: t.etiqueta,
      partidos: porTemporada.get(t.id)!.partidos,
      competiciones: Array.from(porTemporada.get(t.id)!.competiciones),
    }));
}

export async function getListadoRivales() {
  return getRivalesTopHome(1000);
}

export async function getHomeData() {
  const [stats, ultimoPartido, efemerides, jugadorDestacado, recordHistorico, temporadaDestacada, rivalesTop, aleatorios, cobertura, cumpleanosHoy] =
    await Promise.all([
      getStatsGlobales(),
      getUltimoPartidoHome(),
      getEfemeridesHoy(),
      getJugadorDestacadoHome(),
      getRecordHistoricoHome(),
      getTemporadaDestacadaHome(),
      getRivalesTopHome(5),
      getAleatoriosHome(),
      getCoberturaHome(),
      getCumpleanosHoy(),
    ]);

  return {
    stats,
    ultimoPartido,
    efemerides,
    jugadorDestacado,
    recordHistorico,
    temporadaDestacada,
    rivalesTop,
    aleatorios,
    cobertura,
    cumpleanosHoy,
  };
}

// ---------------------------------------------------------------------------
// ENTRENADORES
// ---------------------------------------------------------------------------

async function getPartidosDirigidosRaw(personaId?: number) {
  const filas: any[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    let query = supabase
      .from('partido_entrenadores')
      .select(
        `persona_id, es_interino,
         partido:partidos(id, fecha, slug, goles_local, goles_visitante, jornada,
           equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre_corto),
           equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre_corto),
           edicion:ediciones_competicion(temporada:temporadas(etiqueta), competicion:competiciones(nombre_actual)))`
      )
      .eq('equipo_id', CORDOBA_ID)
      .order('partido_id', { ascending: true })
      .order('persona_id', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (personaId) query = query.eq('persona_id', personaId);
    const { data: pagina } = await query;
    if (!pagina || pagina.length === 0) break;
    filas.push(...pagina);
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }
  return filas.filter((f: any) => f.partido);
}

export async function getEntrenadoresListado() {
  type PartidoResumenLite = { fecha: string; resultado: 'V' | 'E' | 'D' | null };
  const filas = await getPartidosDirigidosRaw();

  const porEntrenador = new Map<number, PartidoResumenLite[]>();

  for (const f of filas) {
    const p: any = f.partido;
    const cordobaEsLocal = p.equipo_local.id === CORDOBA_ID;
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;
    let resultado: 'V' | 'E' | 'D' | null = null;
    if (golesCordoba != null && golesRival != null) {
      resultado = golesCordoba > golesRival ? 'V' : golesCordoba === golesRival ? 'E' : 'D';
    }
    const lista = porEntrenador.get(f.persona_id) ?? [];
    lista.push({ fecha: p.fecha, resultado });
    porEntrenador.set(f.persona_id, lista);
  }

  const ids = Array.from(porEntrenador.keys());
  const { data: personasData } = await supabase
    .from('personas')
    .select('id, nombre_mostrado, slug, foto_url')
    .in('id', ids);
  const personasPorId = new Map((personasData ?? []).map((p: any) => [p.id, p]));

  return Array.from(porEntrenador.entries())
    .map(([persona_id, partidos]) => {
      const persona: any = personasPorId.get(persona_id);
      if (!persona) return null;
      const ordenados = [...partidos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      let v = 0,
        e = 0,
        d = 0;
      for (const p of ordenados) {
        if (p.resultado === 'V') v += 1;
        else if (p.resultado === 'E') e += 1;
        else if (p.resultado === 'D') d += 1;
      }
      const totalDecididos = v + e + d;
      const rachas = calcularRachas(ordenados as any);
      return {
        id: persona.id,
        nombre_mostrado: persona.nombre_mostrado,
        slug: persona.slug,
        foto_url: persona.foto_url,
        partidos: ordenados.length,
        v,
        e,
        d,
        pctV: totalDecididos > 0 ? (v / totalDecididos) * 100 : 0,
        mejorRachaVictorias: rachas.mejorRachaVictorias.longitud,
        mejorRachaInvicto: rachas.mejorRachaInvicto.longitud,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.partidos - a.partidos);
}

export type PartidoResumen = {
  fecha: string;
  slug: string;
  rival: string;
  local: boolean;
  golesCordoba: number | null;
  golesRival: number | null;
  resultado: 'V' | 'E' | 'D' | null;
  competicion: string | null;
  temporada: string | null;
};

// Encuentra la racha más larga (cronológicamente, en orden) que cumple el predicado.
// Si hay empate entre varias rachas de igual longitud, se queda con la primera en el tiempo.
function encontrarMejorRacha(partidos: PartidoResumen[], cumple: (r: PartidoResumen['resultado']) => boolean) {
  let mejorInicio = -1,
    mejorLongitud = 0;
  let actualInicio = -1,
    actualLongitud = 0;

  partidos.forEach((p, i) => {
    if (cumple(p.resultado)) {
      if (actualLongitud === 0) actualInicio = i;
      actualLongitud += 1;
      if (actualLongitud > mejorLongitud) {
        mejorLongitud = actualLongitud;
        mejorInicio = actualInicio;
      }
    } else {
      actualLongitud = 0;
    }
  });

  if (mejorLongitud === 0) return { longitud: 0, partidos: [] as PartidoResumen[] };
  return { longitud: mejorLongitud, partidos: partidos.slice(mejorInicio, mejorInicio + mejorLongitud) };
}

export function calcularRachas(partidos: PartidoResumen[]) {
  return {
    mejorRachaVictorias: encontrarMejorRacha(partidos, (r) => r === 'V'),
    peorRachaDerrotas: encontrarMejorRacha(partidos, (r) => r === 'D'),
    mejorRachaInvicto: encontrarMejorRacha(partidos, (r) => r === 'V' || r === 'E'),
    peorRachaSinGanar: encontrarMejorRacha(partidos, (r) => r === 'E' || r === 'D'),
  };
}

export async function getEntrenadorBySlug(slug: string) {
  const { data: persona, error } = await supabase.from('personas').select('*').eq('slug', slug).single();
  if (error || !persona) return null;

  const filas = await getPartidosDirigidosRaw(persona.id);
  if (filas.length === 0) return null;

  const partidosOrdenados = filas
    .map((f: any) => f.partido)
    .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  let victorias = 0,
    empates = 0,
    derrotas = 0;
  const partidosResumen = partidosOrdenados.map((p: any) => {
    const cordobaEsLocal = p.equipo_local.id === CORDOBA_ID;
    const rival = cordobaEsLocal ? p.equipo_visitante : p.equipo_local;
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;
    let resultado: 'V' | 'E' | 'D' | null = null;
    if (golesCordoba != null && golesRival != null) {
      resultado = golesCordoba > golesRival ? 'V' : golesCordoba === golesRival ? 'E' : 'D';
      if (resultado === 'V') victorias += 1;
      else if (resultado === 'E') empates += 1;
      else derrotas += 1;
    }
    return {
      fecha: p.fecha,
      slug: p.slug,
      rival: rival?.nombre_corto ?? '?',
      local: cordobaEsLocal,
      golesCordoba,
      golesRival,
      resultado,
      competicion: p.edicion?.competicion?.nombre_actual ?? null,
      temporada: p.edicion?.temporada?.etiqueta ?? null,
    };
  });

  const totalPartidos = partidosOrdenados.length;
  const totalDecididos = victorias + empates + derrotas;
  const pct = (n: number) => (totalDecididos > 0 ? ((n / totalDecididos) * 100).toFixed(1) : '0.0');

  // Ranking entre entrenadores por partidos dirigidos
  const listado = await getEntrenadoresListado();
  const rankingPartidos = listado.findIndex((e: any) => e.id === persona.id) + 1;

  // Jugadores más utilizados bajo su mando
  const partidoIds = partidosOrdenados.map((p: any) => p.id);
  let jugadoresMasUtilizados: { persona_id: number; nombre_mostrado: string; slug: string; partidos: number }[] = [];
  if (partidoIds.length > 0) {
    const filasConv: any[] = [];
    const PAGE = 1000;
    let desde = 0;
    while (true) {
      const { data: pagina } = await supabase
        .from('convocatorias')
        .select('persona_id, jugo, persona:personas(id, nombre_mostrado, slug)')
        .eq('equipo_id', CORDOBA_ID)
        .eq('jugo', true)
        .in('partido_id', partidoIds)
        .order('partido_id', { ascending: true })
        .order('persona_id', { ascending: true })
        .range(desde, desde + PAGE - 1);
      if (!pagina || pagina.length === 0) break;
      filasConv.push(...pagina);
      if (pagina.length < PAGE) break;
      desde += PAGE;
    }
    const conteo = new Map<number, { nombre_mostrado: string; slug: string; partidos: number }>();
    for (const row of filasConv) {
      const p: any = (row as any).persona;
      if (!p) continue;
      const actual = conteo.get(p.id) ?? { nombre_mostrado: p.nombre_mostrado, slug: p.slug, partidos: 0 };
      actual.partidos += 1;
      conteo.set(p.id, actual);
    }
    jugadoresMasUtilizados = Array.from(conteo.entries())
      .map(([persona_id, v]) => ({ persona_id, ...v }))
      .sort((a, b) => b.partidos - a.partidos)
      .slice(0, 10);
  }

  const { count: partidosComoJugador } = await supabase
    .from('convocatorias')
    .select('*', { count: 'exact', head: true })
    .eq('equipo_id', CORDOBA_ID)
    .eq('jugo', true)
    .eq('persona_id', persona.id);
  const esTambienJugador = (partidosComoJugador ?? 0) > 0;

  const rachas = calcularRachas(partidosResumen);

  return {
    persona,
    partidos: partidosResumen,
    totalPartidos,
    victorias,
    empates,
    derrotas,
    porcentajes: { v: pct(victorias), e: pct(empates), d: pct(derrotas) },
    rankingPartidos,
    debut: partidosResumen[0],
    ultimo: partidosResumen[partidosResumen.length - 1],
    jugadoresMasUtilizados,
    esTambienJugador,
    rachas,
  };
}
// ---------------------------------------------------------------------------
// RÉCORDS Y CURIOSIDADES DEL CLUB
// ---------------------------------------------------------------------------

async function getPartidosCordobaTodos(): Promise<PartidoResumen[]> {
  const filas: any[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data: pagina } = await supabase
      .from('partidos')
      .select(
        `fecha, slug, goles_local, goles_visitante,
         equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre_corto),
         equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre_corto),
         edicion:ediciones_competicion(temporada:temporadas(etiqueta), competicion:competiciones(nombre_actual))`
      )
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .order('fecha', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (!pagina || pagina.length === 0) break;
    filas.push(...pagina);
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }

  return filas.map((p: any) => {
    const cordobaEsLocal = p.equipo_local.id === CORDOBA_ID;
    const rival = cordobaEsLocal ? p.equipo_visitante : p.equipo_local;
    const golesCordoba = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const golesRival = cordobaEsLocal ? p.goles_visitante : p.goles_local;
    let resultado: 'V' | 'E' | 'D' | null = null;
    if (golesCordoba != null && golesRival != null) {
      resultado = golesCordoba > golesRival ? 'V' : golesCordoba === golesRival ? 'E' : 'D';
    }
    return {
      fecha: p.fecha,
      slug: p.slug,
      rival: rival?.nombre_corto ?? '?',
      local: cordobaEsLocal,
      golesCordoba,
      golesRival,
      resultado,
      competicion: p.edicion?.competicion?.nombre_actual ?? null,
      temporada: p.edicion?.temporada?.etiqueta ?? null,
    };
  });
}

async function getDebutsEdades() {
  const { data } = await supabase
    .from('v_jugador_debut')
    .select('fecha_debut, persona:personas(nombre_mostrado, slug, fecha_nacimiento)');

  return (data ?? [])
    .filter((row: any) => row.persona?.fecha_nacimiento)
    .map((row: any) => {
      const edadDias = Math.floor(
        (new Date(row.fecha_debut).getTime() - new Date(row.persona.fecha_nacimiento).getTime()) / 86400000
      );
      return {
        nombre_mostrado: row.persona.nombre_mostrado,
        slug: row.persona.slug,
        fecha: row.fecha_debut,
        edadAnios: Math.floor(edadDias / 365.25),
        edadDiasResto: Math.floor(edadDias % 365.25),
      };
    })
    .filter((d: any) => d.edadAnios >= 14 && d.edadAnios <= 45); // descarta fechas de nacimiento con errores evidentes
}

async function getEdadesUltimoPartido() {
  const { data } = await supabase
    .from('v_jugador_ultimo')
    .select('fecha_ultimo, persona:personas(nombre_mostrado, slug, fecha_nacimiento)');

  return (data ?? [])
    .filter((row: any) => row.persona?.fecha_nacimiento)
    .map((row: any) => {
      const edadDias = Math.floor(
        (new Date(row.fecha_ultimo).getTime() - new Date(row.persona.fecha_nacimiento).getTime()) / 86400000
      );
      return {
        nombre_mostrado: row.persona.nombre_mostrado,
        slug: row.persona.slug,
        fecha: row.fecha_ultimo,
        edadAnios: Math.floor(edadDias / 365.25),
        edadDiasResto: Math.floor(edadDias % 365.25),
      };
    })
    .filter((d: any) => d.edadAnios >= 14 && d.edadAnios <= 50); // descarta fechas de nacimiento con errores evidentes
}

export async function getCumpleanosHoy() {
  const hoy = new Date();
  const mmdd = `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const idsJugadores = new Set<number>();
  {
    const PAGE = 1000;
    let desde = 0;
    while (true) {
      const { data: pagina } = await supabase
        .from('v_jugador_partidos')
        .select('persona_id')
        .order('persona_id', { ascending: true })
        .range(desde, desde + PAGE - 1);
      if (!pagina || pagina.length === 0) break;
      pagina.forEach((r: any) => idsJugadores.add(r.persona_id));
      if (pagina.length < PAGE) break;
      desde += PAGE;
    }
  }
  const idsEntrenadores = new Set<number>(
    (await getEntrenadoresListado()).map((e: any) => e.id)
  );
  const todosIds = Array.from(new Set([...idsJugadores, ...idsEntrenadores]));
  if (todosIds.length === 0) return [];

  const { data: personasData } = await supabase
    .from('personas')
    .select('id, nombre_mostrado, slug, fecha_nacimiento')
    .in('id', todosIds)
    .not('fecha_nacimiento', 'is', null);

  return (personasData ?? [])
    .filter((p: any) => {
      const f = new Date(p.fecha_nacimiento + 'T00:00:00');
      const pmmdd = `${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
      return pmmdd === mmdd;
    })
    .map((p: any) => ({
      nombre_mostrado: p.nombre_mostrado,
      slug: p.slug,
      esJugador: idsJugadores.has(p.id),
      fecha_nacimiento: p.fecha_nacimiento,
    }));
}

export async function getPartidosPorResultado(golesCordoba: number, golesRival: number) {
  const partidos = await getPartidosCordobaTodos();
  return partidos
    .filter((p) => p.golesCordoba === golesCordoba && p.golesRival === golesRival)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

export async function getRecordsData() {
  const partidos = await getPartidosCordobaTodos();
  const decididos = partidos.filter((p) => p.golesCordoba != null && p.golesRival != null);

  const mayoresVictorias = [...decididos]
    .filter((p) => p.resultado === 'V')
    .sort((a, b) => b.golesCordoba! - b.golesRival! - (a.golesCordoba! - a.golesRival!))
    .slice(0, 5);

  const mayoresDerrotas = [...decididos]
    .filter((p) => p.resultado === 'D')
    .sort((a, b) => a.golesCordoba! - a.golesRival! - (b.golesCordoba! - b.golesRival!))
    .slice(0, 5);

  const rachas = calcularRachas(partidos);

  const frecuencia = new Map<string, { cuenta: number; ejemplo: PartidoResumen }>();
  for (const p of decididos) {
    const key = `${p.golesCordoba}-${p.golesRival}`;
    const actual = frecuencia.get(key) ?? { cuenta: 0, ejemplo: p };
    actual.cuenta += 1;
    frecuencia.set(key, actual);
  }
  const resultadosOrdenados = Array.from(frecuencia.entries())
    .map(([resultado, v]) => ({ resultado, ...v }))
    .sort((a, b) => b.cuenta - a.cuenta);

  // Scorigami: rejilla goles del Córdoba (filas) x goles del rival (columnas)
  const maxGolesCordoba = Math.max(...decididos.map((p) => p.golesCordoba!), 4);
  const maxGolesRival = Math.max(...decididos.map((p) => p.golesRival!), 4);
  const filasScorigami: { golesCordoba: number; golesRival: number; cuenta: number; slug: string | null }[][] = [];
  for (let gc = 0; gc <= maxGolesCordoba; gc++) {
    const fila = [];
    for (let gr = 0; gr <= maxGolesRival; gr++) {
      const entry = frecuencia.get(`${gc}-${gr}`);
      fila.push({ golesCordoba: gc, golesRival: gr, cuenta: entry?.cuenta ?? 0, slug: entry?.ejemplo.slug ?? null });
    }
    filasScorigami.push(fila);
  }
  const celdasTotal = (maxGolesCordoba + 1) * (maxGolesRival + 1);
  const scorigami = {
    filas: filasScorigami,
    maxGolesCordoba,
    maxGolesRival,
    celdasOcupadas: resultadosOrdenados.length,
    celdasTotal,
  };

  const NOMBRES_MES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const meses = NOMBRES_MES.map((nombre, i) => ({ mes: i + 1, nombre, pj: 0, v: 0, e: 0, d: 0 }));
  for (const p of decididos) {
    const m = new Date(p.fecha + 'T00:00:00').getMonth();
    meses[m].pj += 1;
    if (p.resultado === 'V') meses[m].v += 1;
    else if (p.resultado === 'E') meses[m].e += 1;
    else meses[m].d += 1;
  }

  const debuts = await getDebutsEdades();
  const masJovenes = [...debuts].sort((a, b) => a.edadAnios - b.edadAnios || a.edadDiasResto - b.edadDiasResto).slice(0, 5);

  const edadesUltimoPartido = await getEdadesUltimoPartido();
  const masVeteranos = [...edadesUltimoPartido]
    .sort((a, b) => b.edadAnios - a.edadAnios || b.edadDiasResto - a.edadDiasResto)
    .slice(0, 5);

  return {
    mayoresVictorias,
    mayoresDerrotas,
    rachas,
    resultadosOrdenados,
    totalResultadosDistintos: resultadosOrdenados.length,
    scorigami,
    meses,
    masJovenes,
    masVeteranos,
  };
}
