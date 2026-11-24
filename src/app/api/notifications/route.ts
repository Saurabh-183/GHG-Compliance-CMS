import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { syncClientDeadlineNotifications } from '@/lib/deadlineReminders';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectToDatabase();

    // Auto-generate deadline reminders for approaching (<= 5 days) and overdue items
    if (session.role === 'CLIENT' || session.role === 'ADMIN') {
      try {
        await syncClientDeadlineNotifications(session);
      } catch (syncErr) {
        console.warn('Deadline reminder sync skipped:', syncErr);
      }
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Clean up read notifications older than 24 hours
    void Notification.deleteMany({
      isRead: true,
      $or: [
        { readAt: { $lt: cutoff } },
        { readAt: { $exists: false }, updatedAt: { $lt: cutoff } },
      ],
    }).catch((err) => console.warn('Notification cleanup warning:', err));

    const baseConditions: Record<string, unknown>[] = [
      { recipientRole: { $in: [session.role, 'ALL'] } },
      {
        $or: [
          { recipientUserId: session.userId },
          { recipientUserId: { $exists: false } },
          { recipientUserId: null },
        ],
      },
      {
        $or: [
          { isRead: false }, // All unread notifications ALWAYS come
          { isRead: true, readAt: { $gte: cutoff } }, // Read within last 24h
          { isRead: true, readAt: { $exists: false }, updatedAt: { $gte: cutoff } },
        ],
      },
    ];

    if (session.role !== 'ADMIN') {
      baseConditions.push({
        $or: [
          { facilityId: { $in: session.authorizedFacilityIds || [] } },
          { facilityId: { $exists: false } },
          { facilityId: null },
        ],
      });
    }

    const filter = { $and: baseConditions };
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(40).lean();

    const unreadCountFilter: Record<string, unknown> = {
      isRead: false,
      recipientRole: { $in: [session.role, 'ALL'] },
      $or: [
        { recipientUserId: session.userId },
        { recipientUserId: { $exists: false } },
        { recipientUserId: null },
      ],
    };
    if (session.role !== 'ADMIN') {
      unreadCountFilter.$and = [
        {
          $or: [
            { facilityId: { $in: session.authorizedFacilityIds || [] } },
            { facilityId: { $exists: false } },
            { facilityId: null },
          ],
        },
      ];
    }

    const unreadCount = await Notification.countDocuments(unreadCountFilter);
    if (session.role !== 'ADMIN') {
      let allowedFacilityIds = (session.authorizedFacilityIds || []).map((id) => id.toUpperCase());
      if (session.role === 'CLIENT' && session.clientGroupId) {
        const companyFacilityIds = await getClientFacilityIds(session.clientGroupId);
        allowedFacilityIds = [...new Set([...allowedFacilityIds, ...companyFacilityIds])];
      }
      filter.$and = [{
        $or: [
          { facilityId: { $in: allowedFacilityIds } },
          { facilityId: { $exists: false } },
          { facilityId: null },
        ],
      }];
    }
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
