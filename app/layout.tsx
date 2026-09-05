import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Archivo Blanquiverde',
  description: 'Toda la historia del Córdoba CF, en un solo lugar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="bg-blanquiverde-verde text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg">
              ARCHIVO BLANQUIVERDE
            </Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/partidos">Partidos</Link>
              <Link href="/temporadas">Temporadas</Link>
              <Link href="/jugadores">Jugadores</Link>
              <Link href="/entrenadores">Entrenadores</Link>
              <Link href="/rivales">Rivales</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-sm text-gray-500 py-8">
          Archivo Blanquiverde · Toda la historia del Córdoba CF
        </footer>
      </body>
    </html>
  );
}
