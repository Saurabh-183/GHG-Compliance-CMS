import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel } from '@/models/Dataset';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    let dataset: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      dataset = await DatasetModel.findById(id)
        .populate('consultantSubmission.consultantId', 'name email designation avatarUrl')
        .populate('reviewerApproval.reviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!dataset) {
      dataset = await DatasetModel.findOne({
        $or: [{ _id: id }, { facilityId: id.toUpperCase() }],
      })
        .populate('consultantSubmission.consultantId', 'name email designation avatarUrl')
        .populate('reviewerApproval.reviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!dataset) {
      const { generateDriveDatasetForFacility } = await import('@/lib/gdrive');
      dataset = generateDriveDatasetForFacility(id);
      try {
        await DatasetModel.create({
          facilityId: dataset.facilityId,
          datasetType: dataset.datasetType,
          period: dataset.period,
          months: dataset.months,
          submissionStatus: dataset.submissionStatus,
          verificationStatus: dataset.verificationStatus,
          toleranceDefault: dataset.toleranceDefault,
          consultantSubmission: dataset.consultantSubmission,
          auditTrail: dataset.auditTrail,
        });
      } catch (dbErr) {
        console.warn('Could not persist auto-synced dataset in [id] route:', dbErr);
      }
    }

    if (session && session.role === 'CLIENT' && !isAuthorizedForFacility(session, dataset.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Client portal view: hide internal consultant notes & internal rejection comments
    if (session && session.role === 'CLIENT') {
      const sanitizedMonths = (dataset.months || []).map((m: any) => ({
        ...m,
        consultantNotes: undefined,
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...dataset,
          _id: dataset._id?.toString() || id,
          months: sanitizedMonths,
          reviewerApproval: dataset.reviewerApproval?.status === 'APPROVED'
            ? dataset.reviewerApproval
            : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dataset,
        _id: dataset._id?.toString() || id,
      },
    });
  } catch (error) {
    console.warn('Error fetching dataset from DB, returning fallback demo dataset:', error);
    const { generateDriveDatasetForFacility } = await import('@/lib/gdrive');
    const fallback = generateDriveDatasetForFacility(id || 'TRIDENT_PAPER');
    return NextResponse.json({
      success: true,
      data: fallback,
    });
  }
}
