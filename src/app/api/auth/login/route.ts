import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase, isMongoObjectId } from '@/lib/db';
import { UserModel, IUserDocument } from '@/models/User';
import { FacilityModel } from '@/models/Facility';
import { signToken, getSessionFromRequest } from '@/lib/auth';
import { findUserForSession } from '@/lib/resolveSessionUser';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';
import { UserRole } from '@/types';

const COOKIE_NAME = 'cc_auth_token';

function userPayload(user: any) {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    clientGroupId: user.clientGroupId?.toString(),
    authorizedFacilityIds: user.authorizedFacilityIds || [],
    mustChangePassword: !!user.mustChangePassword,
  };
}

// Fallback demo accounts for instant access when MONGODB_URI is not yet configured in Vercel
const DEMO_FALLBACK_ACCOUNTS: Record<string, {
  name: string;
  role: UserRole;
  designation: string;
  avatarUrl: string;
  authorizedFacilityIds: string[];
  clientGroupId?: string;
}> = {
  'consultant@carboncrunch.com': {
    name: 'Priya Sharma',
    role: 'CONSULTANT',
    designation: 'Senior Energy & Carbon Compliance Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
    authorizedFacilityIds: ['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'],
  },
  'admin@carboncrunch.com': {
    name: 'Saurabh Agnihotri',
    role: 'ADMIN',
    designation: 'Principal Compliance Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    authorizedFacilityIds: ['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'],
  },
  'client@tridentindia.com': {
    name: 'Vikram Singh',
    role: 'CLIENT',
    designation: 'Head of Regulatory Affairs & Sustainability',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
    clientGroupId: 'TRIDENT',
    authorizedFacilityIds: ['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password || password.length > 200) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    await connectToDatabase();
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    if (user.status && user.status !== 'ACTIVE') return NextResponse.json({ error: 'This account is disabled. Contact your administrator.' }, { status: 403 });
    if (user.role === 'CLIENT' && !user.clientGroupId) return NextResponse.json({ error: 'Your company account is not configured. Contact your administrator.' }, { status: 403 });
    let authorizedFacilityIds = user.authorizedFacilityIds || [];
    if (user.role === 'CONSULTANT' && authorizedFacilityIds.length === 0) {
      const assigned = await FacilityModel.find({ $or: [{ assignedConsultantId: user._id }, { assignedReviewerId: user._id }], status: { $ne: 'INACTIVE' } }).select('facilityId').lean();
      authorizedFacilityIds = assigned.map((facility) => facility.facilityId.toUpperCase());
    }

    // Client access is scoped by the client's company. Do not rely only on
    // a manually maintained authorizedFacilityIds array: older client users
    // may have a valid clientGroupId but an empty facility list.
    if (user.role === 'CLIENT' && user.clientGroupId) {
      const companyFacilityIds = await getClientFacilityIds(String(user.clientGroupId));
      authorizedFacilityIds = [...new Set([...authorizedFacilityIds.map((id: string) => id.toUpperCase()), ...companyFacilityIds])];
    }
    const payload = { userId: user._id.toString(), name: user.name, email: user.email, role: user.role,
      clientGroupId: user.clientGroupId?.toString(), authorizedFacilityIds, mustChangePassword: !!user.mustChangePassword };
    const token = signToken(payload);
    const response = NextResponse.json({ success: true, user: { ...userPayload(user), authorizedFacilityIds } });
    response.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user: IUserDocument | null = isMongoObjectId(session.userId)
      ? await UserModel.findOne({ _id: session.userId, role: session.role, status: { $nin: ['DISABLED', 'LOCKED'] } })
      : await findUserForSession(session);

    if (user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          avatarUrl: user.avatarUrl,
          clientGroupId: user.clientGroupId ? user.clientGroupId.toString() : undefined,
          authorizedFacilityIds: user.authorizedFacilityIds,
        },
      });
    }
  } catch {
    if (isMongoObjectId(session.userId)) {
      return NextResponse.json({ authenticated: false }, { status: 503 });
    }
  }

  if (isMongoObjectId(session.userId)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
  });
}
