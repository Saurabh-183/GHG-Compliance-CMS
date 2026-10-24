import { NextResponse, NextRequest } from 'next/server';

interface JWTPayload {
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONSULTANT' | 'REVIEWER' | 'CLIENT';
  clientGroupId?: string;
  authorizedFacilityIds?: string[];
}

function decodeJwtPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that do not require authentication
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/seed') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('cc_auth_token')?.value;

  // If not logged in, redirect to login page
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = decodeJwtPayload(token);
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 1. RBAC Restriction: Client role is strictly confined to /portal
  const isInternalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/approvals') ||
    pathname.startsWith('/datasets') ||
    pathname.startsWith('/assessments') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/calendar') ||
    (pathname.startsWith('/facilities') && !pathname.startsWith('/portal'));

  if (user.role === 'CLIENT' && isInternalRoute) {
    // External Client is barred from internal consultant/reviewer routes
    return NextResponse.redirect(new URL('/portal?denied=unauthorized_internal', request.url));
  }

  // 2. RBAC Restriction: Internal staff cannot enter Client Portal
  if (user.role !== 'CLIENT' && pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. RBAC Restriction: Consultant cannot enter Reviewer Approvals Queue
  if (user.role === 'CONSULTANT' && pathname.startsWith('/approvals')) {
    // Consultant cannot approve their own submissions or audit verifications
    return NextResponse.redirect(new URL('/dashboard?denied=reviewer_only', request.url));
  }

  // 4. Role-based landing: Root path '/' routes based on verified role
  if (pathname === '/') {
    if (user.role === 'CLIENT') {
      return NextResponse.redirect(new URL('/portal', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
