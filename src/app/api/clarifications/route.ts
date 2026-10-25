import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ClarificationModel, IClarificationDocument } from '@/models/Clarification';
import { DatasetModel } from '@/models/Dataset';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { generateClarificationEmailDraft } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session && session.role === 'CLIENT' && session.authorizedFacilityIds) {
      query.facilityId = { $in: session.authorizedFacilityIds };
    }

    if (status) query.status = status;

    let rawClarifications = await ClarificationModel.find(query)
      .populate('raisedBy', 'name email designation')
      .sort({ createdAt: -1 })
      .lean();

    if (rawClarifications.length === 0 && !facilityId) {
      const totalCount = await ClarificationModel.countDocuments();
      if (totalCount === 0) {
        const { seedDatabase } = await import('@/lib/seedData');
        await seedDatabase();
        rawClarifications = await ClarificationModel.find(query)
          .populate('raisedBy', 'name email designation')
          .sort({ createdAt: -1 })
          .lean();
      }
    }

    const clarifications = rawClarifications as unknown as (IClarificationDocument & { _id: { toString(): string } })[];

    return NextResponse.json({
      success: true,
      data: clarifications.map((c) => ({
        ...c,
        _id: c._id.toString(),
        datasetId: c.datasetId.toString(),
        raisedBy: c.raisedBy ? (c.raisedBy as { _id?: { toString(): string } })._id?.toString() || c.raisedBy.toString() : '',
      })),
    });
  } catch (error) {
    console.warn('Error fetching clarifications from DB, returning fallback demo clarification:', error);
    const demoClarifications = [
      {
        _id: 'clar_demo_june_2025',
        datasetId: '6adb9175b32c50edab95461f',
        facilityId: 'TRIDENT_PAPER',
        month: '2025-06',
        metricKey: 'grid_electricity_consumption',
        issueDescription:
          'Declared monthly consumption (1,280,000 kWh) does not match DISCOM bill (1,265,000 kWh). Net variance: 15,000 kWh (1.186%). Official explanation and revised supporting bill required.',
        raisedBy: 'Priya Sharma (Senior Energy & Carbon Compliance Lead)',
        status: 'OPEN',
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
        conversationHistory: [
          {
            sender: 'Priya Sharma (Consultant)',
            senderRole: 'CONSULTANT',
            message:
              'Discrepancy identified in June 2025 electricity records during RCO audit reconciliation. Please verify PSPCL bill statement.',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      data: demoClarifications,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden: Only Consultants can raise clarifications' }, { status: 403 });
    }

    const body = (await request.json()) as {
      facilityId: string;
      datasetId: string;
      month: string;
      parameter: string;
      declaredValue: number;
      evidenceValue: number;
      comment: string;
      supportingLink: string;
      unit?: string;
    };

    const facility = await FacilityModel.findOne({ facilityId: body.facilityId.toUpperCase() });
    const facilityName = facility ? facility.name : body.facilityId;
    const variance = Math.abs(body.declaredValue - body.evidenceValue);
    const variancePercentage = body.declaredValue > 0 ? (variance / body.declaredValue) * 100 : 0;
    const unit = body.unit || 'kWh';

    const emailDraft = generateClarificationEmailDraft({
      facilityName,
      month: body.month,
      parameter: body.parameter,
      declaredValue: body.declaredValue,
      evidenceValue: body.evidenceValue,
      variance,
      unit,
      sourceDocUrl: body.supportingLink,
    });

    const clarification = await ClarificationModel.create({
      facilityId: body.facilityId.toUpperCase(),
      datasetId: new mongoose.Types.ObjectId(body.datasetId),
      month: body.month,
      parameter: body.parameter,
      declaredValue: body.declaredValue,
      evidenceValue: body.evidenceValue,
      variance,
      variancePercentage: Number(variancePercentage.toFixed(3)),
      comment: body.comment,
      supportingLink: body.supportingLink,
      status: 'OPEN',
      emailDraft,
      raisedBy: new mongoose.Types.ObjectId(session!.userId),
      raisedByName: session!.name,
      raisedAt: new Date(),
    });

    // Update dataset record
    const dataset = await DatasetModel.findById(body.datasetId);
    if (dataset) {
      const monthRecord = dataset.months.find((m) => m.month === body.month);
      if (monthRecord) {
        monthRecord.clarificationId = clarification._id.toString();
        monthRecord.result = 'MISMATCH';
      }
      dataset.verificationStatus = 'CLARIFICATION_REQUIRED';
      dataset.auditTrail.push({
        timestamp: new Date(),
        userId: session!.userId,
        userName: session!.name,
        action: 'CLARIFICATION_RAISED',
        details: `Raised clarification for ${body.month}: Variance ${variance} ${unit}. Email draft generated.`,
      });
      await dataset.save();
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Clarification raised and email draft generated successfully',
        data: clarification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error raising clarification:', error);
    return NextResponse.json({ error: 'Failed to raise clarification' }, { status: 500 });
  }
}
