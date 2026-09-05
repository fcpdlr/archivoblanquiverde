// @ts-nocheck
import { getEntrenadoresListado } from '@/lib/queries';
import Link from 'next/link';

export default async function EntrenadoresIndexPage() {
  const entrenadores = await getEntrenadoresListado();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-blanquiverde-verde mb-2">Entrenadores</h1>
      <p className="text-gray-500 mb-6">
        Todos los técnicos que han dirigido al Córdoba CF, ordenados por partidos en el banquillo.
      </p>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b bg-gray-50">
              <th className="py-2 px-4">#</th>
              <th className="py-2 px-4">Entrenador</th>
              <th className="py-2 px-4 text-center">Partidos</th>
              <th className="py-2 px-4 text-center">V</th>
              <th className="py-2 px-4 text-center">E</th>
              <th className="py-2 px-4 text-center">D</th>
            </tr>
          </thead>
          <tbody>
            {entrenadores.map((e: any, i: number) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 px-4 text-gray-400">{i + 1}</td>
                <td className="py-2 px-4">
                  <Link href={`/entrenadores/${e.slug}`} className="hover:underline font-medium">
                    {e.nombre_mostrado}
                  </Link>
                </td>
                <td className="py-2 px-4 text-center">{e.partidos}</td>
                <td className="py-2 px-4 text-center">{e.v}</td>
                <td className="py-2 px-4 text-center">{e.e}</td>
                <td className="py-2 px-4 text-center">{e.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
