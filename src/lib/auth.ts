import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { IAuthUserSession, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || '';
function assertJwtSecret() {
  if (JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}

export function signToken(payload: IAuthUserSession): string {
  assertJwtSecret();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30m', issuer: 'carbon-crunch', audience: 'carbon-crunch-web' });
}

export function verifyToken(token: string): IAuthUserSession | null {
  try {
    assertJwtSecret();
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'carbon-crunch', audience: 'carbon-crunch-web' }) as IAuthUserSession;
    if (!decoded.userId || !['ADMIN', 'CONSULTANT', 'CLIENT'].includes(decoded.role)) return null;
    return decoded;
  } catch { return null; }
}

export function getSessionFromRequest(request: NextRequest): IAuthUserSession | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = verifyToken(token);
    if (session) return session;
  }

  const cookie = request.cookies.get('cc_auth_token');
  if (cookie?.value) {
    const session = verifyToken(cookie.value);
    if (session) return session;
    // Do not impersonate dev ADMIN when a stale/invalid cookie is present
    return null;
  }

  // Optional demo-role header for local role testing.
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_ROLE_HEADER === 'true') {
    const demoRole = request.headers.get('X-Demo-Role') as UserRole | null;
    const demoUser = request.headers.get('X-Demo-User-Id');

    if (demoRole && ['ADMIN', 'CONSULTANT', 'CLIENT'].includes(demoRole)) {
      return {
        userId: demoUser || 'USR_DEMO',
        name:
          demoRole === 'ADMIN'
            ? 'Saurabh (Admin)'
            : demoRole === 'CONSULTANT'
            ? 'Priya Sharma (Consultant & Compliance Lead)'
            : 'Vikram Singh (Trident Client)',
        email: `${demoRole.toLowerCase()}@carboncrunch.com`,
        role: demoRole,
        clientGroupId: demoRole === 'CLIENT' ? '66f000000000000000000001' : undefined,
        authorizedFacilityIds: demoRole === 'CLIENT' ? ['TRIDENT_PAPER', 'TRIDENT_YARN'] : undefined,
      };
    }
  }

  // Local development runs as an ADMIN by default so the application can be
  // explored and tested without repeatedly logging in. This never applies in production.
  if (process.env.NODE_ENV === 'development') {
    return {
      userId: 'local-development-admin',
      name: 'Local Development Admin',
      email: 'local-admin@localhost',
      role: 'ADMIN',
    };
  }

  return null;
}

export function authorizeRole(session: IAuthUserSession | null, allowedRoles: UserRole[]): boolean {
  return !!session && allowedRoles.includes(session.role);
}

export function isAuthorizedForFacility(session: IAuthUserSession | null, facilityId: string): boolean {
  if (!session || !facilityId) return false;
  if (session.role === 'ADMIN') return true;
  const allowed = (session.authorizedFacilityIds || []).map((id) => id.toUpperCase());
  return allowed.includes(facilityId.toUpperCase());
}
