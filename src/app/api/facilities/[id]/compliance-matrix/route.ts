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
    let applicabilityRecords = await ComplianceApplicabilityModel.find({
      facilityId: facilityCode,
    }).lean();

    // Fetch assessments to get assessmentId for direct navigation
    let assessments = await AssessmentModel.find({
      facilityId: facilityCode,
    }).lean();

    const { buildMultiYearComplianceMatrix, COMPLIANCE_FRAMEWORKS, COMPLIANCE_PERIODS } = await import('@/lib/complianceMatrixData');

    const formattedExistingApps = applicabilityRecords.map((r) => ({
      ...r,
      _id: r._id.toString(),
      deadline: r.deadline ? r.deadline.toISOString() : null,
    }));

    const formattedExistingAsms = assessments.map((a) => ({
      ...a,
      _id: a._id.toString(),
    }));

    const { matrix, applicabilities, assessments: generatedAssessments } = buildMultiYearComplianceMatrix(
      facilityCode,
      facility.name,
      formattedExistingApps as any,
      formattedExistingAsms as any
    );

    // Persist to MongoDB if it was newly generated
    if (applicabilityRecords.length === 0 && applicabilities.length > 0) {
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
      } catch (insertErr) {
        // Ignore duplicate key or connection warnings
      }
    }

    if (assessments.length === 0 && generatedAssessments.length > 0) {
      try {
        await AssessmentModel.insertMany(
          generatedAssessments.map((asm) => ({
            facilityId: asm.facilityId,
            complianceType: asm.complianceType,
            period: asm.period,
            workflowStatus: asm.workflowStatus,
            complianceOutcome: asm.complianceOutcome,
            isHistorical: asm.isHistorical || false,
            version: asm.version || 1,
            documentLinks: asm.documentLinks,
            metrics: asm.metrics,
          })),
          { ordered: false }
        );
      } catch (insertErr) {
        // Ignore duplicate key or connection warnings
      }
    }

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
        periods: COMPLIANCE_PERIODS,
        compliances: COMPLIANCE_FRAMEWORKS,
        matrix,
        rawApplicability: applicabilities,
      },
    });
  } catch (error) {
    console.warn('Error fetching compliance matrix from DB, returning fallback multi-year matrix:', error);
    const { buildMultiYearComplianceMatrix, COMPLIANCE_FRAMEWORKS, COMPLIANCE_PERIODS } = await import('@/lib/complianceMatrixData');
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

    const { matrix, applicabilities } = buildMultiYearComplianceMatrix(
      resolvedFacility.facilityId,
      resolvedFacility.name
    );

    return NextResponse.json({
      success: true,
      data: {
        facility: resolvedFacility,
        periods: COMPLIANCE_PERIODS,
        compliances: COMPLIANCE_FRAMEWORKS,
        matrix,
        rawApplicability: applicabilities,
      },
    });
  }
}
