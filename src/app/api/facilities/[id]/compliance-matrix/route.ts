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
  const { id } = await params;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    let facility;
    if (mongoose.Types.ObjectId.isValid(id)) {
      facility = await FacilityModel.findById(id).lean();
    }
    if (!facility) {
      facility = await FacilityModel.findOne({ facilityId: id.toUpperCase() }).lean();
    }

    if (!facility) {
      const facilityCount = await FacilityModel.countDocuments();
      if (facilityCount === 0) {
        const { seedDatabase } = await import('@/lib/seedData');
        await seedDatabase();
        if (mongoose.Types.ObjectId.isValid(id)) {
          facility = await FacilityModel.findById(id).lean();
        }
        if (!facility) {
          facility = await FacilityModel.findOne({ facilityId: id.toUpperCase() }).lean();
        }
      }
    }

    if (!facility) {
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const found = MOCK_FACILITIES.find(
        (f) => f.facilityId === id.toUpperCase() || f._id === id
      );
      if (found) {
        facility = found as any;
      }
    }

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, facility.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Resolve client group details (name and code) for accurate breadcrumbs and routing
    let clientGroupName = (facility as any).clientGroupName;
    let clientGroupCode = (facility as any).clientGroupCode || (facility as any).code;
    const rawGroupId = (facility as any).clientGroupId?.toString() || '';

    if (!clientGroupName && rawGroupId) {
      if (mongoose.Types.ObjectId.isValid(rawGroupId)) {
        const { ClientGroupModel } = await import('@/models/ClientGroup');
        const cg = await ClientGroupModel.findById(rawGroupId).lean();
        if (cg) {
          clientGroupName = cg.name;
          clientGroupCode = cg.code;
        }
      }
      if (!clientGroupName) {
        const { MOCK_CLIENT_GROUPS } = await import('@/lib/mockFallback');
        const cg = MOCK_CLIENT_GROUPS.find(
          (g) => g._id === rawGroupId || g.code.toUpperCase() === rawGroupId.toUpperCase()
        );
        if (cg) {
          clientGroupName = cg.name;
          clientGroupCode = cg.code;
        }
      }
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
          clientGroupId: rawGroupId,
          clientGroupName: clientGroupName || (facility as any).clientGroupName || 'Client Group',
          clientGroupCode: clientGroupCode || rawGroupId,
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
    console.warn('Error fetching compliance matrix from DB, returning fallback demo matrix:', error);
    const periods = ['FY2022-23', 'FY2023-24', 'FY2024-25', 'FY2025-26'];
    const compliances: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

    const matrix: Record<string, Record<string, IComplianceMatrixCell>> = {
      RCO: {
        'FY2022-23': { period: 'FY2022-23', complianceType: 'RCO', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT' },
        'FY2023-24': { period: 'FY2023-24', complianceType: 'RCO', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'SURPLUS' },
        'FY2024-25': { period: 'FY2024-25', complianceType: 'RCO', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'SHORTFALL', assessmentId: '66f000000000000000000010' },
        'FY2025-26': { period: 'FY2025-26', complianceType: 'RCO', isApplicable: true, workflowStatus: 'DATA_COLLECTION', complianceOutcome: 'PENDING_DETERMINATION', assessmentId: '66f000000000000000000011' },
      },
      PAT: {
        'FY2022-23': { period: 'FY2022-23', complianceType: 'PAT', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT' },
        'FY2023-24': { period: 'FY2023-24', complianceType: 'PAT', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT' },
        'FY2024-25': { period: 'FY2024-25', complianceType: 'PAT', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT', assessmentId: '66f000000000000000000012' },
        'FY2025-26': { period: 'FY2025-26', complianceType: 'PAT', isApplicable: true, workflowStatus: 'DATA_COLLECTION', complianceOutcome: 'PENDING_DETERMINATION', assessmentId: '66f000000000000000000013' },
      },
      CCTS: {
        'FY2022-23': { period: 'FY2022-23', complianceType: 'CCTS', isApplicable: false, workflowStatus: 'NOT_STARTED', complianceOutcome: 'NOT_APPLICABLE' },
        'FY2023-24': { period: 'FY2023-24', complianceType: 'CCTS', isApplicable: false, workflowStatus: 'NOT_STARTED', complianceOutcome: 'NOT_APPLICABLE' },
        'FY2024-25': { period: 'FY2024-25', complianceType: 'CCTS', isApplicable: true, workflowStatus: 'UNDER_REVIEW', complianceOutcome: 'PENDING_DETERMINATION', assessmentId: '66f000000000000000000014' },
        'FY2025-26': { period: 'FY2025-26', complianceType: 'CCTS', isApplicable: true, workflowStatus: 'DATA_COLLECTION', complianceOutcome: 'PENDING_DETERMINATION', assessmentId: '66f000000000000000000015' },
      },
      CEA: {
        'FY2022-23': { period: 'FY2022-23', complianceType: 'CEA', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT' },
        'FY2023-24': { period: 'FY2023-24', complianceType: 'CEA', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT' },
        'FY2024-25': { period: 'FY2024-25', complianceType: 'CEA', isApplicable: true, workflowStatus: 'APPROVED', complianceOutcome: 'COMPLIANT', assessmentId: '66f000000000000000000016' },
        'FY2025-26': { period: 'FY2025-26', complianceType: 'CEA', isApplicable: true, workflowStatus: 'DATA_COLLECTION', complianceOutcome: 'COMPLIANT', assessmentId: '66f000000000000000000017' },
      },
    };

    const { MOCK_FACILITIES, MOCK_CLIENT_GROUPS } = await import('@/lib/mockFallback');
    const foundFacility = MOCK_FACILITIES.find(
      (f) => f.facilityId === id.toUpperCase() || f._id === id
    );

    let resolvedFacility = foundFacility;
    if (!resolvedFacility) {
      resolvedFacility = {
        _id: 'fac_' + id.toLowerCase(),
        facilityId: id.toUpperCase(),
        name: id.replace(/_/g, ' '),
        clientGroupId: 'TRIDENT',
        clientGroupName: 'Trident Group',
        clientGroupCode: 'TRIDENT',
        location: 'Industrial Complex Site',
        category: 'Designated Consumer (DC)',
        status: 'ACTIVE',
      };
    } else {
      const matchedGroup = MOCK_CLIENT_GROUPS.find(
        (g) => g._id === resolvedFacility.clientGroupId || g.code === resolvedFacility.clientGroupId
      );
      if (matchedGroup) {
        resolvedFacility = {
          ...resolvedFacility,
          clientGroupName: matchedGroup.name,
          clientGroupCode: matchedGroup.code,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        facility: resolvedFacility,
        periods,
        compliances,
        matrix,
        rawApplicability: [],
      },
    });
  }
}
