import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { IAuthUserSession, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'carbon_crunch_local_development_only_change_me');

function assertJwtSecret() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
}

export function signToken(payload: IAuthUserSession): string {
  assertJwtSecret();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): IAuthUserSession | null {
  try {
    assertJwtSecret();
    const decoded = jwt.verify(token, JWT_SECRET) as IAuthUserSession;
    return decoded;
  } catch {
    return null;
  }
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

export function authorizeRole(
  session: IAuthUserSession | null,
  allowedRoles: UserRole[]
): boolean {
  if (!session) return false;
  return allowedRoles.includes(session.role);
}

export function isAuthorizedForFacility(
  session: IAuthUserSession | null,
  facilityId: string
): boolean {
  if (!session) return false;
  // Internal roles can view all facilities
  if (['ADMIN', 'CONSULTANT'].includes(session.role)) {
    return true;
  }
  // Client role must have explicit authorization
  if (session.role === 'CLIENT') {
    if (!session.authorizedFacilityIds) return false;
    return session.authorizedFacilityIds.includes(facilityId.toUpperCase());
  }
  return false;
}
