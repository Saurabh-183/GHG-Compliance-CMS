import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { UserModel } from '@/models/User';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session || !mongoose.Types.ObjectId.isValid(session.userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { currentPassword, newPassword } = await request.json();
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
      return NextResponse.json({ error: 'New password must be between 12 and 128 characters.' }, { status: 400 });
    }
    await connectToDatabase();
    const user = await UserModel.findById(session.userId).select('+passwordHash');
    if (!user || (user.status && user.status !== 'ACTIVE')) return NextResponse.json({ error: 'Account unavailable.' }, { status: 403 });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();
    const response = NextResponse.json({ success: true, message: 'Password changed. Please sign in again.' });
    response.cookies.set('cc_auth_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    console.error('Password change failed:', error);
    return NextResponse.json({ error: 'Unable to change password.' }, { status: 500 });
  }
}
