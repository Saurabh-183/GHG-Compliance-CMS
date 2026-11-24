import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith('/_next') || pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout') || pathname === '/login' || pathname === '/change-password' || pathname.startsWith('/api/auth/change-password') || pathname === '/favicon.ico' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname);
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get('cc_auth_token')?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const url = new URL('/login', request.url); url.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(url);
    response.cookies.set('cc_auth_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  }
  if (user.mustChangePassword && pathname !== '/change-password' && !pathname.startsWith('/api/auth/change-password')) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Password change required.' }, { status: 403 });
    return NextResponse.redirect(new URL('/change-password', request.url));
  }
  if (pathname.startsWith('/api/admin/') && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  if (pathname.startsWith('/admin') && user.role !== 'ADMIN') return NextResponse.redirect(new URL('/dashboard?denied=forbidden', request.url));
  if (pathname.startsWith('/api/portal/') && user.role !== 'CLIENT') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  if (pathname === '/') return NextResponse.redirect(new URL(user.role === 'CLIENT' ? '/portal' : '/dashboard', request.url));
  const clientBlocked = ['/dashboard','/client-uploads','/approvals','/datasets','/assessments','/clients','/calendar','/facilities','/drive-explorer'];
  if (user.role === 'CLIENT' && clientBlocked.some((path) => pathname.startsWith(path))) return NextResponse.redirect(new URL('/portal?denied=unauthorized_internal', request.url));
  if (user.role !== 'CLIENT' && pathname.startsWith('/portal')) return NextResponse.redirect(new URL('/dashboard', request.url));
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'] };
