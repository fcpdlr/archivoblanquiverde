import { NextResponse } from 'next/server';

const COOKIE_NAME = 'ab_acceso';
const CLAVE = 'WfjO9jBQUPEaILy0GYniz7MHawmyrCfk';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clave = url.searchParams.get('clave');
  const destino = new URL('/', request.url);

  if (clave !== CLAVE) {
    return NextResponse.redirect(destino);
  }

  const response = NextResponse.redirect(destino);
  response.cookies.set(COOKIE_NAME, CLAVE, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
  });
  return response;
}
