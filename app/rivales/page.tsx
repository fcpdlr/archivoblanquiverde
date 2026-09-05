// @ts-nocheck
export const dynamic = 'force-dynamic';

import { getListadoRivales } from '@/lib/queries';

export default async function RivalesIndexPage() {
  const rivales = await getListadoRivales();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-blanquiverde-verde mb-2">Rivales</h1>
      <p className="text-gray-500 mb-6">
        Historial completo del Córdoba CF frente a todos sus rivales, ordenado por partidos disputados.
      </p>
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
            {rivales.map((r: any) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 px-4 flex items-center gap-2">
                  {r.escudo && <img src={r.escudo} alt="" className="w-5 h-5 object-contain" />}
                  {r.nombre}
                </td>
                <td className="py-2 px-4 text-center">{r.pj}</td>
                <td className="py-2 px-4 text-center">{r.v}</td>
                <td className="py-2 px-4 text-center">{r.e}</td>
                <td className="py-2 px-4 text-center">{r.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Las fichas individuales de rival estarán disponibles cuando se complete la fusión de clubes duplicados en el archivo.
      </p>
    </div>
  );
}
