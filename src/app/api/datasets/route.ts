import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel, IDatasetDocument } from '@/models/Dataset';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const period = searchParams.get('period');
    const datasetType = searchParams.get('datasetType');

    const query: Record<string, unknown> = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session && session.role === 'CLIENT' && session.authorizedFacilityIds) {
      query.facilityId = { $in: session.authorizedFacilityIds };
    }

    if (period) query.period = period;
    if (datasetType) query.datasetType = datasetType;

    const rawDatasets = await DatasetModel.find(query)
      .populate('consultantSubmission.consultantId', 'name email')
      .populate('reviewerApproval.reviewerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const datasets = rawDatasets as unknown as (IDatasetDocument & { _id: { toString(): string } })[];

    if (datasets.length > 0) {
      return NextResponse.json({
        success: true,
        data: datasets.map((d) => ({
          ...d,
          _id: d._id.toString(),
        })),
      });
    }

    // If query was for a specific facility and no dataset is saved yet, dynamically generate and seed from Drive
    if (facilityId) {
      const { generateDriveDatasetForFacility } = await import('@/lib/gdrive');
      const fallbackDs = generateDriveDatasetForFacility(facilityId);
      try {
        // Attempt to persist to MongoDB for durability
        await DatasetModel.create({
          facilityId: fallbackDs.facilityId,
          datasetType: fallbackDs.datasetType,
          period: fallbackDs.period,
          months: fallbackDs.months,
          submissionStatus: fallbackDs.submissionStatus,
          verificationStatus: fallbackDs.verificationStatus,
          toleranceDefault: fallbackDs.toleranceDefault,
          consultantSubmission: fallbackDs.consultantSubmission,
          auditTrail: fallbackDs.auditTrail,
        });
      } catch (dbErr) {
        console.warn('Could not persist auto-synced Drive dataset to DB:', dbErr);
      }
      return NextResponse.json({ success: true, data: [fallbackDs] });
    }

    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (error) {
    console.warn('Error fetching datasets from DB, returning fallback demo dataset:', error);
    const searchParams = request.nextUrl.searchParams;
    const requestedFacility = searchParams.get('facilityId');
    const { generateDriveDatasetForFacility } = await import('@/lib/gdrive');
    const fallback = generateDriveDatasetForFacility(requestedFacility || 'TRIDENT_PAPER');
    return NextResponse.json({ success: true, data: [fallback] });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      facilityId: string;
      datasetType: 'GRID_ELECTRICITY' | 'RENEWABLE_PURCHASE' | 'FUEL_CONSUMPTION' | 'PRODUCTION';
      period: string;
      toleranceDefault?: number;
    };

    const newDataset = await DatasetModel.create({
      ...body,
      facilityId: body.facilityId.toUpperCase(),
      months: [],
      submissionStatus: 'REQUESTED',
      verificationStatus: 'NOT_STARTED',
      toleranceDefault: body.toleranceDefault || 0,
      auditTrail: [
        {
          timestamp: new Date(),
          userId: session?.userId || 'SYSTEM',
          userName: session?.name || 'Consultant',
          action: 'DATASET_INITIALIZED',
          details: `Initialized ${body.datasetType} dataset for ${body.period}`,
        },
      ],
    });

    return NextResponse.json(
      { success: true, message: 'Dataset created', data: newDataset },
      { status: 201 }
    );
  } catch (error) {
    console.warn('Error creating dataset in DB, returning demo success:', error);
    const { MOCK_DATASET } = await import('@/lib/mockFallback');
    return NextResponse.json(
      { success: true, message: 'Dataset created (Demo Mode)', data: MOCK_DATASET },
      { status: 201 }
    );
  }
}
