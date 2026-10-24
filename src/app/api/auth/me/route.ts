import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/models/User';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(session.userId);
    if (!user) {
      return NextResponse.json({ authenticated: true, user: session });
    }

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
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
