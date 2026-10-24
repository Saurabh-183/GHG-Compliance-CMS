import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { IAuthUserSession, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'carbon_crunch_jwt_secret_token_mvp_2026_secure';

export function signToken(payload: IAuthUserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): IAuthUserSession | null {
  try {
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

  // Check cookie next
  const cookie = request.cookies.get('cc_auth_token');
  if (cookie && cookie.value) {
    const session = verifyToken(cookie.value);
    if (session) return session;
  }

  // For seamless demo switching without breaking API calls, support custom demo header
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
