import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
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
      url: string; description?: string;
      utilityConnection?: { providerName: string; connectionType: string; subDivision: string; circle: string; consumerAccountNumber: string; consumerName: string; meterNumber: string; contractDemand: string };
      billDetails?: { invoiceNumber: string; billingFrom: string; billingTo: string; consumptionKwh: number; billAmount: number };
    };

    if (!body.url || !/^https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(body.url.trim())) {
      return NextResponse.json({ error: 'A valid Google Drive URL is required' }, { status: 400 });
    }
    const connection = body.utilityConnection;
    const bill = body.billDetails;
    const isElectricityRequest = /electricity|grid|discom|power bill/i.test(`${requirement.title} ${requirement.description}`);
    if (isElectricityRequest && (!connection || ![connection.providerName, connection.connectionType, connection.subDivision, connection.circle, connection.consumerAccountNumber, connection.consumerName, connection.meterNumber, connection.contractDemand].every((value) => typeof value === 'string' && value.trim()) || !bill || !bill.invoiceNumber?.trim() || !bill.billingFrom || !bill.billingTo ||
        !Number.isFinite(Number(bill.consumptionKwh)) || Number(bill.consumptionKwh) < 0 ||
        !Number.isFinite(Number(bill.billAmount)) || Number(bill.billAmount) < 0)) {
      return NextResponse.json({ error: 'Complete the electricity connection and bill details before submitting.' }, { status: 400 });
    }

    const submitterName = session?.name || 'Client User';
    if (isElectricityRequest && connection) {
      const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId });
      if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
      facility.set('utilityConnection', { ...connection, updatedAt: new Date(), updatedBy: submitterName });
      await facility.save();
    }

    requirement.submittedDriveLinks.push({
      url: body.url.trim(),
      submittedAt: new Date(),
      submittedBy: submitterName,
      description: body.description || 'Supporting documentation via Client Portal',
      ...(isElectricityRequest && bill && connection ? {
        billDetails: { ...bill, invoiceNumber: bill.invoiceNumber.trim(), consumptionKwh: Number(bill.consumptionKwh), billAmount: Number(bill.billAmount) },
        utilityConnectionSnapshot: connection,
      } : {}),
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
    console.error('Error submitting client data request:', error);
    return NextResponse.json({ error: 'Submission could not be saved. Please try again.' }, { status: 500 });
  }
}
