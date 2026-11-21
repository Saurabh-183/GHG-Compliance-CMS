import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import type { IDataRequirement } from '@/types';
import {
  buildClientMonthlyEvidenceRows,
  summarizeEvidenceRows,
} from '@/lib/clientMonthlyEvidenceRows';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const facilityId = request.nextUrl.searchParams.get('facilityId')?.toUpperCase();
  const period = request.nextUrl.searchParams.get('period')?.trim();

  if (!facilityId || !period) {
    return NextResponse.json({ error: 'facilityId and period are required' }, { status: 400 });
  }

  if (!isAuthorizedForFacility(session, facilityId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const requirements = await DataRequirementModel.find({
      facilityId,
      period,
    })
      .select(
        'facilityId period title requestId workflowStatus submissionStatus monthlyFrequency reportingMonths submittedDriveLinks'
      )
      .lean();

    const serialized = requirements.map((r) => ({
      ...r,
      _id: r._id.toString(),
      submittedDriveLinks: (r.submittedDriveLinks || []).map((link) => ({
        ...link,
        submittedAt:
          link.submittedAt instanceof Date
            ? link.submittedAt.toISOString()
            : link.submittedAt
              ? String(link.submittedAt)
              : undefined,
      })),
    }));

    const rows = buildClientMonthlyEvidenceRows(serialized as unknown as IDataRequirement[]);
    const summary = summarizeEvidenceRows(rows);

    return NextResponse.json({
      success: true,
      data: { rows, summary },
    });
  } catch (error) {
    console.warn('portal/facility-evidence fallback:', error);
    return NextResponse.json({
      success: true,
      source: 'unavailable',
      data: {
        rows: [],
        summary: summarizeEvidenceRows([]),
      },
    });
  }
}