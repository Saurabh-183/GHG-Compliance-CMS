import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { UserModel } from '@/models/User';
import { FacilityModel } from '@/models/Facility';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    await connectToDatabase();
    const users = await UserModel.find({}).select('-passwordHash').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: users.map((u) => ({ ...u, _id: u._id.toString(), clientGroupId: u.clientGroupId?.toString() })) });
  } catch (error) {
    console.error('Admin user listing failed:', error);
    return NextResponse.json({ error: 'Unable to load users.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const designation = typeof body.designation === 'string' ? body.designation.trim() : '';
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['ADMIN','CONSULTANT','CLIENT'].includes(role) || password.length < 12 || password.length > 128) {
      return NextResponse.json({ error: 'Provide a valid name, email, role and a password of at least 12 characters.' }, { status: 400 });
    }
    await connectToDatabase();
    if (await UserModel.exists({ email })) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

    let clientGroupId: mongoose.Types.ObjectId | undefined;
    let authorizedFacilityIds: string[] = [];
    if (role === 'CLIENT') {
      if (!mongoose.Types.ObjectId.isValid(body.clientGroupId)) return NextResponse.json({ error: 'A valid company group is required for client accounts.' }, { status: 400 });
      clientGroupId = new mongoose.Types.ObjectId(body.clientGroupId);
      const facilities = await FacilityModel.find({ clientGroupId, status: { $ne: 'INACTIVE' } }).select('facilityId').lean();
      if (!facilities.length) return NextResponse.json({ error: 'The selected company has no active facilities.' }, { status: 400 });
      authorizedFacilityIds = facilities.map((f) => f.facilityId.toUpperCase());
    } else if (role === 'CONSULTANT') {
     const requested: string[] = Array.isArray(body.authorizedFacilityIds)
  ? Array.from(
      new Set<string>(
        body.authorizedFacilityIds
          .map((id: unknown): string => String(id).trim().toUpperCase())
          .filter((id: string) => id.length > 0)
      )
    )
  : [];
      if (!requested.length) return NextResponse.json({ error: 'Assign at least one facility to the consultant.' }, { status: 400 });
     const matched = await FacilityModel.find({
  facilityId: { $in: requested },
  status: { $ne: 'INACTIVE' }
} as any).select('facilityId').lean();
      if (matched.length !== requested.length) return NextResponse.json({ error: 'One or more facility assignments are invalid.' }, { status: 400 });
      authorizedFacilityIds = requested;
    }

    const user = await UserModel.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role, status: 'ACTIVE', mustChangePassword: true, designation, clientGroupId, authorizedFacilityIds });
    if (role === 'CONSULTANT' && authorizedFacilityIds.length) await FacilityModel.updateMany({ facilityId: { $in: authorizedFacilityIds } }, { $set: { assignedConsultantId: user._id } });
    return NextResponse.json({ success: true, data: { _id: user._id.toString(), name: user.name, email: user.email, role: user.role, status: user.status, designation: user.designation, clientGroupId: user.clientGroupId?.toString(), authorizedFacilityIds: user.authorizedFacilityIds } }, { status: 201 });
  } catch (error) {
    console.error('Admin user creation failed:', error);
    return NextResponse.json({ error: 'Unable to create user.' }, { status: 500 });
  }
}
