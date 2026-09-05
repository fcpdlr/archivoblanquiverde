import { createClient } from '@supabase/supabase-js';

// Clave pública (anon), protegida por Row Level Security: solo lectura.
// Es seguro que esté en el código del frontend.
const SUPABASE_URL = 'https://afisoymotfqkrcatdzyb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaXNveW1vdGZxa3JjYXRkenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDU3NjAsImV4cCI6MjEwMzY4MTc2MH0.RVIJhA2QrASN8hALys6up-GH8-c6k3sGOg7BiU02r2A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    // Next.js intercepta fetch() y lo cachea por defecto. Antes usábamos
    // cache: 'no-store' para evitar datos desactualizados (p.ej. el escudo del
    // Córdoba), pero eso hacía que CADA visita, de cualquier usuario, volviera
    // a ejecutar todas las consultas contra Supabase — la web entera se sentía
    // lenta. En su lugar, cacheamos 60 segundos: rápido para casi todas las
    // visitas, y cualquier cambio nuestro en la base de datos tarda como mucho
    // un minuto en reflejarse, en vez de estar siempre desactivada.
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
      fetch(url, { ...options, next: { revalidate: 60 } } as RequestInit),
  },
});
