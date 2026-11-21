import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectToDatabase();
    const filter: Record<string, unknown> = {
      recipientRole: { $in: [session.role, 'ALL'] },
      $or: [{ recipientUserId: session.userId }, { recipientUserId: { $exists: false } }, { recipientUserId: null }],
    };
    if (session.role !== 'ADMIN') filter.$and = [{ $or: [{ facilityId: { $in: session.authorizedFacilityIds || [] } }, { facilityId: { $exists: false } }, { facilityId: null }] }];
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(30).lean();
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });
    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error('Notifications query failed:', error);
    return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const recipientRole = body.recipientRole;
    if (!['ADMIN', 'CONSULTANT', 'CLIENT', 'ALL'].includes(recipientRole) || typeof body.title !== 'string' || typeof body.message !== 'string' || typeof body.linkUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid notification payload.' }, { status: 400 });
    }
    if (body.facilityId && !isAuthorizedForFacility(session, String(body.facilityId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (session.role === 'CLIENT' && recipientRole !== 'CONSULTANT') return NextResponse.json({ error: 'Clients can only notify their assigned consultants.' }, { status: 403 });
    if (session.role === 'CONSULTANT' && !['CLIENT', 'ADMIN'].includes(recipientRole)) return NextResponse.json({ error: 'Consultants can only notify clients or administrators.' }, { status: 403 });
    if (recipientRole === 'ALL' && session.role !== 'ADMIN') return NextResponse.json({ error: 'Only administrators can send platform-wide notifications.' }, { status: 403 });
    await connectToDatabase();
    const notification = await Notification.create({
      recipientRole, recipientUserId: session.role === 'ADMIN' ? body.recipientUserId : undefined,
      senderRole: session.role, senderName: session.name,
      type: body.type || 'EVIDENCE_SUBMITTED', title: body.title.slice(0, 180), message: body.message.slice(0, 3000),
      facilityId: body.facilityId, linkUrl: body.linkUrl, isRead: false, createdAt: new Date(),
    });
    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (error) {
    console.error('Notification creation failed:', error);
    return NextResponse.json({ error: 'Unable to create notification.' }, { status: 500 });
  }
}
