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

    const rawClarifications = await ClarificationModel.find(query)
      .populate('raisedBy', 'name email designation')
      .sort({ createdAt: -1 })
      .lean();

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
    console.error('Error fetching clarifications:', error);
    return NextResponse.json({ error: 'Failed to fetch clarifications' }, { status: 500 });
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
