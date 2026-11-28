import { NextResponse, NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth';
import { connectToDatabase, isMongoObjectId } from '@/lib/db';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';
import { UserModel } from '@/models/User';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/login' ||
    pathname === '/change-password' ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname);
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get('cc_auth_token')?.value;
  const user = token ? verifyToken(token) : null;
  let accountExists = Boolean(user);
  let requestHeaders: Headers | undefined;
  if (user && isMongoObjectId(user.userId)) {
    try {
      await connectToDatabase();
      const account = await UserModel.findOne({ _id: user.userId, role: user.role, status: { $nin: ['DISABLED', 'LOCKED'] } })
        .select('clientGroupId authorizedFacilityIds').lean();
      accountExists = Boolean(account);
      if (account && pathname.startsWith('/api/') && user.role !== 'ADMIN') {
        const clientGroupId = account.clientGroupId?.toString();
        const authorizedFacilityIds = user.role === 'CLIENT'
          ? await getClientFacilityIds(clientGroupId)
          : account.authorizedFacilityIds || [];
        requestHeaders = new Headers(request.headers);
        requestHeaders.set('Authorization', `Bearer ${signToken({
          userId: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          clientGroupId,
          authorizedFacilityIds,
        })}`);
      }
    } catch (error) {
      console.error('Unable to verify account:', error);
      return NextResponse.json({ error: 'Account verification is temporarily unavailable.' }, { status: 503 });
    }
  }
  if (!user || !accountExists) {
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
  const clientBlocked = ['/dashboard','/client-uploads','/approvals','/datasets','/assessments','/clients','/calendar','/facilities'];
  if (user.role === 'CLIENT' && clientBlocked.some((path) => pathname.startsWith(path))) return NextResponse.redirect(new URL('/portal?denied=unauthorized_internal', request.url));
  if (user.role !== 'CLIENT' && pathname.startsWith('/portal')) return NextResponse.redirect(new URL('/dashboard', request.url));
  return requestHeaders ? NextResponse.next({ request: { headers: requestHeaders } }) : NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'] };
