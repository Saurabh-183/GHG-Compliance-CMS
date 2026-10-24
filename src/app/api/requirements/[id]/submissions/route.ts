import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    const requirement = await DataRequirementModel.findById(id);
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, requirement.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      url: string;
      description?: string;
    };

    if (!body.url || !body.url.trim()) {
      return NextResponse.json({ error: 'Valid Google Drive URL is required' }, { status: 400 });
    }

    const submitterName = session?.name || 'Client User';

    requirement.submittedDriveLinks.push({
      url: body.url.trim(),
      submittedAt: new Date(),
      submittedBy: submitterName,
      description: body.description || 'Supporting documentation via Client Portal',
    });

    requirement.submissionStatus = 'RECEIVED';
    requirement.verificationStatus = 'UNDER_REVIEW';

    await requirement.save();

    // Trigger notification to Consultant that evidence was received
    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({
        recipientRole: 'CONSULTANT',
        senderRole: 'CLIENT',
        senderName: submitterName,
        type: 'EVIDENCE_SUBMITTED',
        title: 'New Client Evidence Submitted',
        message: `${submitterName} submitted Google Drive document for "${requirement.title}" (${requirement.facilityId}).`,
        facilityId: requirement.facilityId,
        linkUrl: `/portal/requests`,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Document link submitted successfully. Status updated to RECEIVED / UNDER REVIEW.',
      data: requirement,
    });
  } catch (error) {
    console.error('Error submitting document link:', error);
    return NextResponse.json({ error: 'Failed to submit document link' }, { status: 500 });
  }
}
