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
    console.error('Error fetching notifications:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

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
    console.error('Error creating notification:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
