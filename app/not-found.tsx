import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="font-mono text-6xl font-bold text-blanquiverde-verde mb-4">404</div>
      <h1 className="font-serif text-2xl font-bold text-blanquiverde-verde mb-3">Esta página no existe</h1>
      <p className="text-gray-500 mb-8">
        Puede que el enlace esté mal escrito o que la página se haya movido. Prueba a buscar desde la portada.
      </p>
      <Link
        href="/"
        className="inline-block bg-blanquiverde-verde text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        Volver a la portada
      </Link>
    </div>
  );
}
