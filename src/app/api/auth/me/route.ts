import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/models/User';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || !mongoose.Types.ObjectId.isValid(session.userId)) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    await connectToDatabase();
    const user = await UserModel.findById(session.userId).lean();
    if (!user || (user.status && user.status !== 'ACTIVE')) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.set('cc_auth_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
      return response;
    }
    let authorizedFacilityIds = user.authorizedFacilityIds || [];
    if (user.role === 'CONSULTANT' && authorizedFacilityIds.length === 0) {
      const assigned = await FacilityModel.find({ $or: [{ assignedConsultantId: user._id }, { assignedReviewerId: user._id }], status: { $ne: 'INACTIVE' } }).select('facilityId').lean();
      authorizedFacilityIds = assigned.map((facility) => facility.facilityId.toUpperCase());
    }
    return NextResponse.json({ authenticated: true, user: {
      _id: user._id.toString(), name: user.name, email: user.email, role: user.role,
      designation: user.designation, avatarUrl: user.avatarUrl,
      clientGroupId: user.clientGroupId?.toString(), authorizedFacilityIds,
      mustChangePassword: !!user.mustChangePassword,
    }});
  } catch (error) {
    console.error('Session verification failed:', error);
    return NextResponse.json({ authenticated: false, error: 'Unable to verify session.' }, { status: 503 });
  }
}
