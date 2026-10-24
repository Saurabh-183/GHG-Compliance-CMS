import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { UserModel, IUserDocument } from '@/models/User';
import { signToken, getSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = (await request.json()) as { email?: string; password?: string; role?: string };
    const { email, password, role } = body;

    let user: IUserDocument | null = null;
    if (role && !email) {
      user = (await UserModel.findOne({ role: role.toUpperCase() } as Record<string, unknown>)) as IUserDocument | null;
    } else if (email) {
      user = (await UserModel.findOne({ email: email.toLowerCase() })) as IUserDocument | null;
      if (user && password) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payload = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      clientGroupId: user.clientGroupId ? user.clientGroupId.toString() : undefined,
      authorizedFacilityIds: user.authorizedFacilityIds,
    };

    const token = signToken(payload);

    const response = NextResponse.json({
      message: 'Login successful',
      token,
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

    response.cookies.set('cc_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await connectToDatabase();
  const user = (await UserModel.findById(session.userId)) as IUserDocument | null;

  return NextResponse.json({
    authenticated: true,
    user: user
      ? {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          avatarUrl: user.avatarUrl,
          clientGroupId: user.clientGroupId ? user.clientGroupId.toString() : undefined,
          authorizedFacilityIds: user.authorizedFacilityIds,
        }
      : session,
  });
}
