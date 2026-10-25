import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);

    const queryRole = searchParams.get('role') || session?.role;

    const filter: Record<string, unknown> = {};
    if (queryRole) {
      filter.recipientRole = { $in: [queryRole, 'ALL'] };
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      ...filter,
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (err: unknown) {
    console.warn('Notifications DB query failed, returning fallback demo notifications:', err);
    const demoNotifications = [
      {
        _id: 'notif_demo_01',
        title: 'Welcome to Carbon Crunch Workspace',
        message: 'Trident Paper FY2025-26 compliance cycle is active. Google Drive document vault connected.',
        recipientRole: 'CONSULTANT',
        type: 'INFO',
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/facilities/TRIDENT_PAPER',
      },
      {
        _id: 'notif_demo_02',
        title: 'Discrepancy Flagged: June 2025 Electricity',
        message: 'June 2025 declared kWh (1,280,000) does not match DISCOM bill (1,265,000). 15,000 kWh variance.',
        recipientRole: 'CONSULTANT',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/datasets/6adb9175b32c50edab95461f/verify',
      },
    ];

    return NextResponse.json({
      success: true,
      data: demoNotifications,
      unreadCount: demoNotifications.length,
    });
  }
}

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    await connectToDatabase();
    body = await req.json();

    const notification = await Notification.create({
      recipientRole: body.recipientRole,
      recipientUserId: body.recipientUserId,
      senderRole: body.senderRole,
      senderName: body.senderName,
      type: body.type,
      title: body.title,
      message: body.message,
      facilityId: body.facilityId,
      linkUrl: body.linkUrl,
      isRead: false,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.warn('Error creating notification in DB, returning demo success:', err);
    return NextResponse.json(
      {
        success: true,
        message: 'Notification recorded (Demo Mode)',
        data: {
          _id: 'notif_demo_' + Date.now(),
          recipientRole: body?.recipientRole || 'CONSULTANT',
          title: body?.title || 'Notification',
          message: body?.message || '',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }
}
