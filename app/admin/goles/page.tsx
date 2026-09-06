import { getGolesPendientesAdmin } from '@/lib/queries';
import GolesAdminClient from './GolesAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminGolesPage() {
  const goles = await getGolesPendientesAdmin(30);
  return <GolesAdminClient golesIniciales={goles as any} />;
}
