
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { AssessmentModel } from '@/models/Assessment';
import {
  getSessionFromRequest,
  isAuthorizedForFacility,
} from '@/lib/auth';
import type { ComplianceType } from '@/types';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = typeof rawId === 'string' ? rawId.trim() : '';

  // Authentication is required only in production.
  const session = getSessionFromRequest(request);

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Facility ID is required.' },
      { status: 400 }
    );
  }

  if (!isDevelopment && !session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();

    let facility;
    let isMockFacility = false;

    // Find facility by MongoDB ObjectId.
    if (mongoose.Types.ObjectId.isValid(id)) {
      facility = await FacilityModel.findById(id).lean();
    }

    // Find facility by facilityId.
    if (!facility) {
      facility = await FacilityModel.findOne({
        facilityId: id.toUpperCase(),
      }).lean();
    }

    // Do not seed or reset the database from a GET request.
    // Use mock fallback only in development.
    if (!facility && isDevelopment) {
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');

      const found = MOCK_FACILITIES.find(
        (item) =>
          item.facilityId?.toUpperCase() === id.toUpperCase() ||
          item._id === id
      );

      if (found) {
        facility = found as any;
        isMockFacility = true;
      }
    }

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          error: `Facility "${id}" was not found.`,
        },
        { status: 404 }
      );
    }

    // Enforce facility authorization only in production.
    if (
      !isDevelopment &&
      (!session || !isAuthorizedForFacility(session, facility.facilityId))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'You are not authorized to access this facility.',
        },
        { status: 403 }
      );
    }

    // Resolve client group information.
    let clientGroupName = (facility as any).clientGroupName;
    let clientGroupCode =
      (facility as any).clientGroupCode || (facility as any).code;

    const rawGroupId =
      (facility as any).clientGroupId?.toString() || '';

    if (!clientGroupName && rawGroupId) {
      if (mongoose.Types.ObjectId.isValid(rawGroupId)) {
        const { ClientGroupModel } = await import('@/models/ClientGroup');

        const cg = await ClientGroupModel.findById(rawGroupId).lean();

        if (cg) {
          clientGroupName = cg.name;
          clientGroupCode = cg.code;
        }
      }

      if (!clientGroupName && isDevelopment) {
        const { MOCK_CLIENT_GROUPS } = await import('@/lib/mockFallback');

        const cg = MOCK_CLIENT_GROUPS.find(
          (group) =>
            group._id === rawGroupId ||
            group.code?.toUpperCase() === rawGroupId.toUpperCase()
        );

        if (cg) {
          clientGroupName = cg.name;
          clientGroupCode = cg.code;
        }
      }
    }

    const facilityCode = facility.facilityId;

    // Fetch compliance applicability records.
    const applicabilityRecords =
      isMockFacility
        ? []
        : await ComplianceApplicabilityModel.find({
            facilityId: facilityCode,
          }).lean();

    // Fetch existing assessments.
    const assessments =
      isMockFacility
        ? []
        : await AssessmentModel.find({
            facilityId: facilityCode,
          }).lean();

    const {
      buildMultiYearComplianceMatrix,
      COMPLIANCE_FRAMEWORKS,
      COMPLIANCE_PERIODS,
    } = await import('@/lib/complianceMatrixData');

    const formattedExistingApps = applicabilityRecords.map((record) => ({
      ...record,
      _id: record._id.toString(),
      deadline: record.deadline
        ? record.deadline.toISOString()
        : null,
    }));

    const formattedExistingAsms = assessments.map((assessment) => ({
      ...assessment,
      _id: assessment._id.toString(),
    }));

    const {
      matrix,
      applicabilities,
      assessments: generatedAssessments,
    } = buildMultiYearComplianceMatrix(
      facilityCode,
      facility.name,
      formattedExistingApps as any,
      formattedExistingAsms as any
    );

    // Persist generated applicability records only for real DB facilities.
    if (
      !isMockFacility &&
      applicabilityRecords.length === 0 &&
      applicabilities.length > 0
    ) {
      try {
        await ComplianceApplicabilityModel.insertMany(
          applicabilities.map((app) => ({
            facilityId: app.facilityId,
            complianceType: app.complianceType,
            period: app.period,
            isApplicable: app.isApplicable,
            authority: app.authority,
            ministry: app.ministry,
            notificationReference: app.notificationReference,
            targetValue: app.targetValue,
            targetUnit: app.targetUnit,
            targetMethodology: app.targetMethodology,
            deadline: app.deadline ? new Date(app.deadline) : null,
            workflowStatus: app.workflowStatus,
            complianceOutcome: app.complianceOutcome,
            notes: app.notes,
          })),
          { ordered: false }
        );
      } catch (insertError) {
        console.warn(
          'Could not persist generated applicability records:',
          insertError
        );
      }
    }

    // Persist generated assessments only for real DB facilities.
    if (
      !isMockFacility &&
      assessments.length === 0 &&
      generatedAssessments.length > 0
    ) {
      try {
        await AssessmentModel.insertMany(
          generatedAssessments.map((assessment) => ({
            facilityId: assessment.facilityId,
            complianceType: assessment.complianceType,
            period: assessment.period,
            workflowStatus: assessment.workflowStatus,
            complianceOutcome: assessment.complianceOutcome,
            isHistorical: assessment.isHistorical || false,
            version: assessment.version || 1,
            documentLinks: assessment.documentLinks,
            metrics: assessment.metrics,
          })),
          { ordered: false }
        );
      } catch (insertError) {
        console.warn(
          'Could not persist generated assessments:',
          insertError
        );
      }
    }

    // Ensure facility enabledFrameworks are strictly respected in the matrix
    const facEnabled = (facility as any).enabledFrameworks as ComplianceType[] | undefined;
    const activeFrameworks: ComplianceType[] =
      facEnabled && Array.isArray(facEnabled) && facEnabled.length > 0
        ? (COMPLIANCE_FRAMEWORKS as ComplianceType[]).filter((c) => facEnabled.includes(c))
        : (COMPLIANCE_FRAMEWORKS as ComplianceType[]);

    (COMPLIANCE_FRAMEWORKS as ComplianceType[]).forEach((comp) => {
      if (!activeFrameworks.includes(comp) && matrix[comp]) {
        for (const period of Object.keys(matrix[comp])) {
          matrix[comp][period].isApplicable = false;
          matrix[comp][period].complianceOutcome = 'NOT_APPLICABLE';
        }
      }
    });

    return NextResponse.json({
      success: true,
      source: isMockFacility ? 'development-mock' : 'database',
      data: {
        facility: {
          ...facility,
          _id: facility._id.toString(),
          clientGroupId: rawGroupId,
          clientGroupName:
            clientGroupName ||
            (facility as any).clientGroupName ||
            'Client Group',
          clientGroupCode: clientGroupCode || rawGroupId,
        },
        periods: COMPLIANCE_PERIODS,
        compliances: activeFrameworks,
        matrix,
        rawApplicability: applicabilities.filter((a) =>
          activeFrameworks.includes(a.complianceType as ComplianceType)
        ),
      },
    });
  } catch (error) {
    console.error(
      'Failed to load facility compliance matrix:',
      error
    );

    // Never silently serve mock records in production.
    if (!isDevelopment) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The facility compliance service is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    // Development fallback.
    try {
      const {
        MOCK_FACILITIES,
        MOCK_CLIENT_GROUPS,
      } = await import('@/lib/mockFallback');

      const foundFacility = MOCK_FACILITIES.find(
        (item) =>
          item.facilityId?.toUpperCase() === id.toUpperCase() ||
          item._id === id
      );

      if (!foundFacility) {
        return NextResponse.json(
          {
            success: false,
            error: `Facility "${id}" was not found.`,
          },
          { status: 404 }
        );
      }

      const matchedGroup = MOCK_CLIENT_GROUPS.find(
        (group) =>
          group._id === foundFacility.clientGroupId ||
          group.code === foundFacility.clientGroupId
      );

      const resolvedFacility = {
        ...foundFacility,
        clientGroupName:
          foundFacility.clientGroupName ||
          matchedGroup?.name ||
          'Client Group',
        clientGroupCode:
          foundFacility.clientGroupCode ||
          matchedGroup?.code ||
          '',
      };

      const {
        buildMultiYearComplianceMatrix,
        COMPLIANCE_FRAMEWORKS,
        COMPLIANCE_PERIODS,
      } = await import('@/lib/complianceMatrixData');

      const {
        matrix,
        applicabilities,
      } = buildMultiYearComplianceMatrix(
        resolvedFacility.facilityId,
        resolvedFacility.name
      );

      // Ensure facility enabledFrameworks are strictly respected in the matrix
      const facFallbackEnabled = (resolvedFacility as any).enabledFrameworks as ComplianceType[] | undefined;
      const activeFallbackFrameworks: ComplianceType[] =
        facFallbackEnabled && Array.isArray(facFallbackEnabled) && facFallbackEnabled.length > 0
          ? (COMPLIANCE_FRAMEWORKS as ComplianceType[]).filter((c) => facFallbackEnabled.includes(c))
          : (COMPLIANCE_FRAMEWORKS as ComplianceType[]);

      (COMPLIANCE_FRAMEWORKS as ComplianceType[]).forEach((comp) => {
        if (!activeFallbackFrameworks.includes(comp) && matrix[comp]) {
          for (const period of Object.keys(matrix[comp])) {
            matrix[comp][period].isApplicable = false;
            matrix[comp][period].complianceOutcome = 'NOT_APPLICABLE';
          }
        }
      });

      return NextResponse.json({
        success: true,
        source: 'development-fallback',
        data: {
          facility: resolvedFacility,
          periods: COMPLIANCE_PERIODS,
          compliances: activeFallbackFrameworks,
          matrix,
          rawApplicability: applicabilities.filter((a) =>
            activeFallbackFrameworks.includes(a.complianceType as ComplianceType)
          ),
        },
      });
    } catch (fallbackError) {
      console.error(
        'Facility fallback failed:',
        fallbackError
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Unable to load facility compliance data.',
        },
        { status: 500 }
      );
    }
  }
}
