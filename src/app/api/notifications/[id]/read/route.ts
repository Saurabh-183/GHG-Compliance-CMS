import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid notification ID.' }, { status: 400 });
  try {
    await connectToDatabase();
    const notification = await Notification.findById(id);
    if (!notification) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    if (notification.recipientRole !== 'ALL' && notification.recipientRole !== session.role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (notification.recipientUserId && notification.recipientUserId !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (notification.facilityId && !isAuthorizedForFacility(session, notification.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    if (notification.facilityId) {
      let facilityAuthorized = isAuthorizedForFacility(session, notification.facilityId);
      if (!facilityAuthorized && session.role === 'CLIENT' && session.clientGroupId) {
        const companyFacilityIds = await getClientFacilityIds(session.clientGroupId);
        facilityAuthorized = companyFacilityIds.includes(notification.facilityId.toUpperCase());
      }
      if (!facilityAuthorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    notification.isRead = true; await notification.save();
    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark notification read failed:', error);
    return NextResponse.json({ error: 'Unable to update notification.' }, { status: 500 });
  }
}
