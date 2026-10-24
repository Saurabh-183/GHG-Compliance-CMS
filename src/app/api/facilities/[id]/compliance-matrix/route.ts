import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { ComplianceType, IComplianceMatrixCell } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    let facility;
    if (mongoose.Types.ObjectId.isValid(id)) {
      facility = await FacilityModel.findById(id).lean();
    }
    if (!facility) {
      facility = await FacilityModel.findOne({ facilityId: id.toUpperCase() }).lean();
    }

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, facility.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const facilityCode = facility.facilityId;

    // Fetch applicability records for this facility
    const applicabilityRecords = await ComplianceApplicabilityModel.find({
      facilityId: facilityCode,
    }).lean();

    // Fetch assessments to get assessmentId for direct navigation
    const assessments = await AssessmentModel.find({
      facilityId: facilityCode,
    }).lean();

    const assessmentMap = new Map<string, string>();
    assessments.forEach((a) => {
      assessmentMap.set(`${a.complianceType}_${a.period}`, a._id.toString());
    });

    const compliances: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];
    const periods = ['FY2024-25', 'FY2025-26', 'FY2026-27'];

    const matrix: Record<ComplianceType, Record<string, IComplianceMatrixCell>> = {
      RCO: {},
      PAT: {},
      CCTS: {},
      CEA: {},
    };

    // Initialize default cells
    compliances.forEach((comp) => {
      periods.forEach((period) => {
        matrix[comp][period] = {
          period,
          complianceType: comp,
          isApplicable: false,
          workflowStatus: 'NOT_STARTED',
          complianceOutcome: 'NOT_APPLICABLE',
        };
      });
    });

    // Populate from actual database records
    applicabilityRecords.forEach((app) => {
      const comp = app.complianceType as ComplianceType;
      // Normalize period to match table columns or display period
      let matchedPeriod = periods.find((p) => p.toLowerCase() === app.period.toLowerCase());
      if (!matchedPeriod) {
        if (app.period.includes('2024-25') || app.period.includes('Cycle-II')) {
          matchedPeriod = 'FY2024-25';
        } else if (app.period.includes('2025-26') || app.period.includes('Monthly')) {
          matchedPeriod = 'FY2025-26';
        } else if (app.period.includes('2026-27')) {
          matchedPeriod = 'FY2026-27';
        }
      }

      if (matchedPeriod && matrix[comp]) {
        const assessmentId =
          assessmentMap.get(`${comp}_${app.period}`) ||
          assessmentMap.get(`${comp}_${matchedPeriod}`);

        matrix[comp][matchedPeriod] = {
          period: matchedPeriod,
          complianceType: comp,
          isApplicable: app.isApplicable,
          workflowStatus: app.workflowStatus,
          complianceOutcome: app.complianceOutcome,
          assessmentId,
          deadline: app.deadline ? app.deadline.toISOString() : undefined,
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        facility: {
          ...facility,
          _id: facility._id.toString(),
          clientGroupId: facility.clientGroupId.toString(),
        },
        periods,
        compliances,
        matrix,
        rawApplicability: applicabilityRecords.map((r) => ({
          ...r,
          _id: r._id.toString(),
          deadline: r.deadline ? r.deadline.toISOString() : null,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching compliance matrix:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance matrix' }, { status: 500 });
  }
}
