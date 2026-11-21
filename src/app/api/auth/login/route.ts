import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/models/User';
import { FacilityModel } from '@/models/Facility';
import { signToken } from '@/lib/auth';

const COOKIE_NAME = 'cc_auth_token';
function userPayload(user: any) {
  return { _id: user._id.toString(), name: user.name, email: user.email, role: user.role,
    designation: user.designation, avatarUrl: user.avatarUrl,
    clientGroupId: user.clientGroupId?.toString(), authorizedFacilityIds: user.authorizedFacilityIds || [],
    mustChangePassword: !!user.mustChangePassword };
}

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
    if (user.role !== 'ADMIN' && authorizedFacilityIds.length === 0) {
      return NextResponse.json({ error: 'No facilities have been assigned to this account. Contact your administrator.' }, { status: 403 });
    }
    const payload = { userId: user._id.toString(), name: user.name, email: user.email, role: user.role,
      clientGroupId: user.clientGroupId?.toString(), authorizedFacilityIds, mustChangePassword: !!user.mustChangePassword };
    const token = signToken(payload);
    const response = NextResponse.json({ success: true, user: { ...userPayload(user), authorizedFacilityIds } });
    response.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 60 });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 });
  }
}
