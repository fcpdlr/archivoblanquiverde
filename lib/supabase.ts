import { createClient } from '@supabase/supabase-js';

// Clave pública (anon), protegida por Row Level Security: solo lectura.
// Es seguro que esté en el código del frontend.
const SUPABASE_URL = 'https://afisoymotfqkrcatdzyb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaXNveW1vdGZxa3JjYXRkenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDU3NjAsImV4cCI6MjEwMzY4MTc2MH0.RVIJhA2QrASN8hALys6up-GH8-c6k3sGOg7BiU02r2A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
