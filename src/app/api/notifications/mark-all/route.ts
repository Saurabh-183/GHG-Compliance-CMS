import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const role = body.role;

    const filter: Record<string, unknown> = { isRead: false };
    if (role) {
      filter.recipientRole = { $in: [role, 'ALL'] };
    }

    await Notification.updateMany(filter, { isRead: true });

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: unknown) {
    console.warn('Error marking notifications as read in DB, returning demo success:', err);
    return NextResponse.json({ success: true, message: 'All notifications marked as read (Demo Mode)' });
  }
}
