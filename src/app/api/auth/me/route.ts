import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
import { getSessionFromRequest } from '@/lib/auth';
import { formatClientGroupDisplayName } from '@/lib/clientGroupDisplay';
import { findUserForSession } from '@/lib/resolveSessionUser';
import { isMongoUnavailableError } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await findUserForSession(session);
    if (user) {
      const clientGroupId = user.clientGroupId ? user.clientGroupId.toString() : undefined;
      let clientGroupCode: string | undefined;
      let clientGroupName: string | undefined;
      if (user.clientGroupId) {
        const group = await ClientGroupModel.findById(user.clientGroupId).select('name code').lean();
        clientGroupName = group?.name;
        clientGroupCode = group?.code;
      }
      const clientGroupDisplayName = formatClientGroupDisplayName({
        clientGroupName,
        clientGroupId,
        clientGroupCode,
      });
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          avatarUrl: user.avatarUrl,
          clientGroupId,
          clientGroupName: clientGroupDisplayName,
          authorizedFacilityIds: user.authorizedFacilityIds,
        },
      });
    }
  } catch (error) {
    if (!isMongoUnavailableError(error)) {
      console.warn('DB lookup in /api/auth/me skipped:', error);
    }
  }

  // Gracefully fallback to the verified JWT session payload
  return NextResponse.json({
    authenticated: true,
    user: {
      _id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      designation:
        session.role === 'ADMIN'
          ? 'Principal Compliance Architect'
          : session.role === 'CONSULTANT'
          ? 'Senior Energy & Carbon Compliance Lead'
          : 'Head of Regulatory Affairs & Sustainability',
      avatarUrl:
        session.role === 'ADMIN'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
          : session.role === 'CONSULTANT'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
      clientGroupId: session.clientGroupId,
      clientGroupName: formatClientGroupDisplayName({ clientGroupId: session.clientGroupId }),
      authorizedFacilityIds: session.authorizedFacilityIds,
    },
  });
}
