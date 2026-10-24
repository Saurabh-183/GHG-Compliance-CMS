import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ClarificationModel } from '@/models/Clarification';
import { DatasetModel } from '@/models/Dataset';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    const clarification = await ClarificationModel.findById(id).lean();
    if (!clarification) {
      return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, clarification.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...clarification,
        _id: clarification._id.toString(),
        datasetId: clarification.datasetId.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching clarification:', error);
    return NextResponse.json({ error: 'Failed to fetch clarification' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    const clarification = await ClarificationModel.findById(id);
    if (!clarification) {
      return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, clarification.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      responseText?: string;
      revisedDriveLink?: string;
      status?: 'OPEN' | 'CLIENT_RESPONDED' | 'RESOLVED';
    };

    if (body.responseText !== undefined || body.revisedDriveLink !== undefined) {
      clarification.clientResponse = {
        responseText: body.responseText || '',
        revisedDriveLink: body.revisedDriveLink || '',
        respondedAt: new Date(),
        respondedBy: session?.name || 'Client Representative',
      };
      clarification.status = body.status || 'CLIENT_RESPONDED';
    } else if (body.status) {
      clarification.status = body.status;
      if (body.status === 'RESOLVED') {
        clarification.resolvedAt = new Date();
      }
    }

    await clarification.save();

    // If client responded with revised link, update audit trail on dataset
    const dataset = await DatasetModel.findById(clarification.datasetId);
    if (dataset) {
      dataset.auditTrail.push({
        timestamp: new Date(),
        userId: session?.userId || 'CLIENT',
        userName: session?.name || 'Client',
        action: 'CLARIFICATION_RESPONDED',
        details: `Client submitted response for ${clarification.month}. Revised Link: ${body.revisedDriveLink || 'N/A'}. Notes: ${body.responseText || 'N/A'}`,
      });
      await dataset.save();
    }

    // Trigger notification to Consultant that Client responded
    try {
      const { Notification } = await import('@/models/Notification');
      const responderName = session?.name || 'Client Representative';
      await Notification.create({
        recipientRole: 'CONSULTANT',
        senderRole: 'CLIENT',
        senderName: responderName,
        type: 'CLARIFICATION_RESPONDED',
        title: 'Client Clarification Response Received',
        message: `${responderName} submitted an explanation and revised evidence for ${clarification.month} discrepancy.`,
        facilityId: clarification.facilityId,
        linkUrl: `/datasets/${clarification.datasetId}/verify`,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Clarification updated successfully',
      data: clarification,
    });
  } catch (error) {
    console.error('Error updating clarification:', error);
    return NextResponse.json({ error: 'Failed to update clarification' }, { status: 500 });
  }
}
