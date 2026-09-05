// @ts-nocheck
import { getJugadoresListado } from '@/lib/queries';
import ListadoJugadores from './ListadoJugadores';

export default async function JugadoresPage() {
  const jugadores = await getJugadoresListado();

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-blanquiverde-verde mb-2">Jugadores</h1>
      <p className="text-gray-500 mb-6">
        Todos los jugadores del Córdoba CF con al menos un partido registrado, ordenados por partidos jugados.
      </p>
      <ListadoJugadores jugadores={jugadores} />
    </div>
  );
}
