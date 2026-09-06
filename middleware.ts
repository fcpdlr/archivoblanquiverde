import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'ab_acceso';
const CLAVE = 'WfjO9jBQUPEaILy0GYniz7MHawmyrCfk';

const RUTAS_PERMITIDAS = new Set([
  '/proximamente',
  '/entrar',
  '/robots.txt',
  '/sitemap.xml',
  '/icon',
  '/apple-icon',
  '/opengraph-image',
  '/favicon.ico',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || RUTAS_PERMITIDAS.has(pathname)) {
    return NextResponse.next();
  }

  if (request.cookies.get(COOKIE_NAME)?.value === CLAVE) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/proximamente';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
