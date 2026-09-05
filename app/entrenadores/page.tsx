// @ts-nocheck
import { getEntrenadoresListado } from '@/lib/queries';
import ComparadorEntrenadores from '@/app/components/ComparadorEntrenadores';

export default async function EntrenadoresIndexPage() {
  const entrenadores = await getEntrenadoresListado();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl font-bold text-blanquiverde-verde mb-2">Entrenadores</h1>
      <p className="text-gray-500 mb-6">
        Todos los técnicos que han dirigido al Córdoba CF. Pulsa en las cabeceras de la tabla para ordenar por
        cualquier columna.
      </p>
      <ComparadorEntrenadores entrenadores={entrenadores} />
    </div>
  );
}
