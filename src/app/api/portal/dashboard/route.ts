
import { NextRequest, NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { DataRequirementModel } from '@/models/DataRequirement';
import { ClarificationModel } from '@/models/Clarification';
import { AssessmentModel } from '@/models/Assessment';
import { CalendarItemModel } from '@/models/CalendarItem';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the request.
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Connect to MongoDB.
    await connectToDatabase();

    // Ensure referenced schemas are registered before populate().
    void ClientGroupModel;
    void CalendarItemModel;

    // 3. Build facility access restrictions.
    let facilityFilter: Record<string, unknown> = {};

    if (session.role !== 'CLIENT') {
      return NextResponse.json({ success: false, error: 'Client portal access only.' }, { status: 403 });
    }

    if (session.role === 'CLIENT') {
      // A client must have an organisation and explicit facility access.
      if (
        !session.clientGroupId ||
        !Array.isArray(session.authorizedFacilityIds) ||
        session.authorizedFacilityIds.length === 0
      ) {
        return NextResponse.json({
          success: true,
          data: {
            facilities: [],
            pendingRequests: [],
            openClarifications: [],
            approvedHistory: [],
            upcomingDeadlines: [],
          },
        });
      }

      // Enforce BOTH organisation ownership and facility authorization.
      facilityFilter = {
        clientGroupId: session.clientGroupId,
        facilityId: {
          $in: session.authorizedFacilityIds,
        },
        status: 'ACTIVE',
      };
    }

    // 4. Fetch only facilities the current user can access.
    const facilities = await FacilityModel.find(facilityFilter)
      .populate('clientGroupId', 'name code industry')
      .lean();

    const facilityIds = facilities.map((facility) =>
      facility.facilityId
    );

    // Never query associated data without an authorized facility.
    if (facilityIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          facilities: [],
          pendingRequests: [],
          openClarifications: [],
          approvedHistory: [],
          upcomingDeadlines: [],
        },
      });
    }

    // Every subsequent query is restricted to these facility IDs.

    // 5. Outstanding data requests.
    const pendingRequests = await DataRequirementModel.find({
      facilityId: { $in: facilityIds },
      submissionStatus: {
        $in: ['REQUESTED', 'PARTIALLY_RECEIVED'],
      },
      isApplicable: true,
    })
      .sort({ dueDate: 1 })
      .lean();

    // 6. Open clarifications.
    const openClarifications = await ClarificationModel.find({
      facilityId: { $in: facilityIds },
      status: {
        $in: ['OPEN', 'CLIENT_RESPONDED'],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    // 7. Approved historical assessments.
    const approvedAssessments = await AssessmentModel.find({
      facilityId: { $in: facilityIds },
      workflowStatus: 'APPROVED',
    })
      .populate('approvedBy', 'name designation')
      .sort({ period: -1 })
      .lean();

    // Only expose approved metrics.
    const sanitizedHistory = approvedAssessments.map((assessment) => {
      const approvedBy = assessment.approvedBy as
        | { name?: string }
        | null;

      return {
        _id: assessment._id.toString(),
        facilityId: assessment.facilityId,
        complianceType: assessment.complianceType,
        period: assessment.period,
        complianceOutcome: assessment.complianceOutcome,
        documentLinks: assessment.documentLinks,
        version: assessment.version,
        approvedByName: approvedBy?.name || '',
        approvedAt: assessment.approvedAt
          ? new Date(assessment.approvedAt).toISOString()
          : null,
        metrics: (assessment.metrics || []).filter(
          (metric) => metric.approvalStatus === 'APPROVED'
        ),
      };
    });

    // 8. Upcoming deadlines.
    const upcomingDeadlines = await CalendarItemModel.find({
      facilityId: { $in: facilityIds },
      status: {
        $in: ['UPCOMING', 'PENDING', 'EXTENDED'],
      },
    })
      .sort({ clientDataSubmissionDeadline: 1 })
      .limit(6)
      .lean();

    // 9. Format facilities.
    const formattedFacilities = facilities.map((facility) => {
      const clientGroup = facility.clientGroupId as unknown as {
        _id?: { toString(): string };
        name?: string;
        code?: string;
        industry?: string;
      };

      return {
        ...facility,
        _id: facility._id.toString(),
        clientGroupId: clientGroup?._id
          ? clientGroup._id.toString()
          : String(facility.clientGroupId),
        clientGroupName: clientGroup?.name || '',
      };
    });

    // 10. Return dashboard data.
    return NextResponse.json({
      success: true,
      data: {
        facilities: formattedFacilities,

        pendingRequests: pendingRequests.map((request) => ({
          ...request,
          _id: request._id.toString(),
          dueDate: request.dueDate
            ? new Date(request.dueDate).toISOString()
            : null,
        })),

        openClarifications: openClarifications.map(
          (clarification) => ({
            ...clarification,
            _id: clarification._id.toString(),
            datasetId: clarification.datasetId
              ? clarification.datasetId.toString()
              : null,
          })
        ),

        approvedHistory: sanitizedHistory,

        upcomingDeadlines: upcomingDeadlines.map((deadline) => ({
          ...deadline,
          _id: deadline._id.toString(),
          clientDataSubmissionDeadline:
            deadline.clientDataSubmissionDeadline
              ? new Date(
                  deadline.clientDataSubmissionDeadline
                ).toISOString()
              : null,
          regulatoryDueDate: deadline.regulatoryDueDate
            ? new Date(
                deadline.regulatoryDueDate
              ).toISOString()
            : null,
        })),
      },
    });
  } catch (error) {
    console.error(
      'Portal dashboard database error:',
      error
    );

    // Never return shared mock data to an authenticated company.
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to load portal dashboard. Please try again.',
      },
      { status: 500 }
    );
  }
}
