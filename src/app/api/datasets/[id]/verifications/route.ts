import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel } from '@/models/Dataset';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { calculateReconciliation } from '@/lib/utils';
import { IMonthlyRecord } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT', 'REVIEWER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dataset = await DatasetModel.findById(id);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, dataset.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (dataset.reviewerApproval?.isLocked) {
      return NextResponse.json({ error: 'Dataset is locked by reviewer approval' }, { status: 400 });
    }

    const body = (await request.json()) as {
      months: IMonthlyRecord[];
      toleranceDefault?: number;
      verificationStatus?: string;
    };

    if (body.toleranceDefault !== undefined) {
      dataset.toleranceDefault = body.toleranceDefault;
    }

    // Process reconciliation for each row
    const updatedMonths = body.months.map((m) => {
      const tolerance = m.tolerance ?? dataset.toleranceDefault ?? 0;
      const recon = calculateReconciliation(m.declaredValue, m.evidenceValue, tolerance);
      return {
        ...m,
        tolerance,
        variance: recon.variance,
        variancePercentage: recon.variancePercentage,
        result: recon.result,
      };
    });

    dataset.months = updatedMonths;

    // Auto-update verification status if there are mismatches or missing evidence
    const hasMismatch = updatedMonths.some((m) => m.result === 'MISMATCH');
    const hasMissing = updatedMonths.some((m) => m.result === 'EVIDENCE_MISSING');

    if (hasMismatch) {
      dataset.verificationStatus = 'CLARIFICATION_REQUIRED';
    } else if (hasMissing) {
      dataset.verificationStatus = 'EVIDENCE_PENDING';
    } else {
      dataset.verificationStatus = 'UNDER_REVIEW';
    }

    dataset.auditTrail.push({
      timestamp: new Date(),
      userId: session?.userId || 'SYSTEM',
      userName: session?.name || 'Consultant',
      action: 'RECONCILIATION_SAVED',
      details: `Saved ${updatedMonths.length} monthly reconciliation records. Status: ${dataset.verificationStatus}`,
    });

    await dataset.save();

    return NextResponse.json({
      success: true,
      message: 'Monthly reconciliation saved successfully',
      data: dataset,
    });
  } catch (error) {
    console.error('Error saving verification:', error);
    return NextResponse.json({ error: 'Failed to save verification' }, { status: 500 });
  }
}
