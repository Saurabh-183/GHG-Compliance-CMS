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
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  const cookie = request.cookies.get('cc_auth_token')?.value;
  return (bearer && verifyToken(bearer)) || (cookie && verifyToken(cookie)) || null;
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
