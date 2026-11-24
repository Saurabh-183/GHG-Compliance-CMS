import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { getSessionFromRequest } from '@/lib/auth';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectToDatabase();
    const filter: Record<string, unknown> = {
      isRead: false, recipientRole: { $in: [session.role, 'ALL'] },
      $or: [{ recipientUserId: session.userId }, { recipientUserId: { $exists: false } }, { recipientUserId: null }],
    };
    if (session.role !== 'ADMIN') {
      let allowedFacilityIds = (session.authorizedFacilityIds || []).map((id) => id.toUpperCase());
      if (session.role === 'CLIENT' && session.clientGroupId) {
        const companyFacilityIds = await getClientFacilityIds(session.clientGroupId);
        allowedFacilityIds = [...new Set([...allowedFacilityIds, ...companyFacilityIds])];
      }
      filter.facilityId = { $in: [...allowedFacilityIds, null] };
    }
    await Notification.updateMany(filter, { $set: { isRead: true } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read failed:', error);
    return NextResponse.json({ error: 'Unable to update notifications.' }, { status: 500 });
  }
}
