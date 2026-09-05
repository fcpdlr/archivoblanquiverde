import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getJugadoresListado, getListadoTemporadas, getEntrenadoresListado } from '@/lib/queries';

const CORDOBA_ID = 74;
const BASE = 'https://archivoblanquiverde.com'; // actualizar cuando se conecte el dominio definitivo

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/partidos`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/temporadas`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/jugadores`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/entrenadores`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/rivales`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/records`, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const [jugadores, temporadas, entrenadores] = await Promise.all([
    getJugadoresListado(),
    getListadoTemporadas(),
    getEntrenadoresListado(),
  ]);

  const jugadoresUrls: MetadataRoute.Sitemap = jugadores
    .filter((j: any) => j.slug)
    .map((j: any) => ({ url: `${BASE}/jugadores/${j.slug}`, changeFrequency: 'monthly', priority: 0.6 }));

  const temporadasUrls: MetadataRoute.Sitemap = temporadas.map((t: any) => ({
    url: `${BASE}/temporadas/${t.etiqueta}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const entrenadoresUrls: MetadataRoute.Sitemap = entrenadores
    .filter((e: any) => e.slug)
    .map((e: any) => ({ url: `${BASE}/entrenadores/${e.slug}`, changeFrequency: 'monthly', priority: 0.5 }));

  // Partidos: paginado porque hay ~2976. Sin JOINs para no repetir el problema de rendimiento de antes.
  const partidosUrls: MetadataRoute.Sitemap = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data: pagina } = await supabase
      .from('partidos')
      .select('slug, fecha')
      .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
      .not('goles_local', 'is', null)
      .order('id', { ascending: true })
      .range(desde, desde + PAGE - 1);
    if (!pagina || pagina.length === 0) break;
    for (const p of pagina as any[]) {
      if (p.slug) partidosUrls.push({ url: `${BASE}/partidos/${p.slug}`, lastModified: p.fecha, changeFrequency: 'yearly', priority: 0.4 });
    }
    if (pagina.length < PAGE) break;
    desde += PAGE;
  }

  // Marcadores exactos (records/resultado/[marcador]): combinaciones que realmente se han dado.
  const { data: marcadoresData } = await supabase
    .from('partidos')
    .select('goles_local, goles_visitante, equipo_local_id, equipo_visitante_id')
    .or(`equipo_local_id.eq.${CORDOBA_ID},equipo_visitante_id.eq.${CORDOBA_ID}`)
    .not('goles_local', 'is', null);
  const marcadoresSet = new Set<string>();
  for (const p of (marcadoresData ?? []) as any[]) {
    const cordobaEsLocal = p.equipo_local_id === CORDOBA_ID;
    const gc = cordobaEsLocal ? p.goles_local : p.goles_visitante;
    const gr = cordobaEsLocal ? p.goles_visitante : p.goles_local;
    marcadoresSet.add(`${gc}-${gr}`);
  }
  const marcadoresUrls: MetadataRoute.Sitemap = Array.from(marcadoresSet).map((m) => ({
    url: `${BASE}/records/resultado/${m}`,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [...estaticas, ...jugadoresUrls, ...temporadasUrls, ...entrenadoresUrls, ...partidosUrls, ...marcadoresUrls];
}
