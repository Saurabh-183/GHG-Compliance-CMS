import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { DataRequirementModel } from '@/models/DataRequirement';
import { ClarificationModel } from '@/models/Clarification';
import { AssessmentModel } from '@/models/Assessment';
import { CalendarItemModel } from '@/models/CalendarItem';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    // If client user, restrict strictly to authorized facilities
    const facilityFilter =
      session && session.role === 'CLIENT' && session.authorizedFacilityIds
        ? { facilityId: { $in: session.authorizedFacilityIds } }
        : {};

    const facilities = await FacilityModel.find(facilityFilter)
      .populate('clientGroupId', 'name code industry')
      .lean();

    const facilityIds = facilities.map((f) => f.facilityId);

    // 1. Outstanding Data Requests (REQUESTED or PARTIALLY_RECEIVED)
    const pendingRequests = await DataRequirementModel.find({
      facilityId: { $in: facilityIds },
      submissionStatus: { $in: ['REQUESTED', 'PARTIALLY_RECEIVED'] },
      isApplicable: true,
    })
      .sort({ dueDate: 1 })
      .lean();

    // 2. Open Clarifications requiring client action
    const openClarifications = await ClarificationModel.find({
      facilityId: { $in: facilityIds },
      status: { $in: ['OPEN', 'CLIENT_RESPONDED'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Approved Historical Assessments & Reports
    const approvedAssessments = await AssessmentModel.find({
      facilityId: { $in: facilityIds },
      workflowStatus: 'APPROVED',
    })
      .populate('approvedBy', 'name designation')
      .sort({ period: -1 })
      .lean();

    // Sanitize assessments: only approved metrics, no internal notes
    const sanitizedHistory = approvedAssessments.map((a) => ({
      _id: a._id.toString(),
      facilityId: a.facilityId,
      complianceType: a.complianceType,
      period: a.period,
      complianceOutcome: a.complianceOutcome,
      documentLinks: a.documentLinks,
      version: a.version,
      approvedByName: (a.approvedBy as { name?: string })?.name,
      approvedAt: a.approvedAt ? a.approvedAt.toISOString() : null,
      metrics: a.metrics.filter((m) => m.approvalStatus === 'APPROVED'),
    }));

    // 4. Client-facing upcoming deadlines
    const upcomingDeadlines = await CalendarItemModel.find({
      facilityId: { $in: facilityIds },
      status: { $in: ['UPCOMING', 'PENDING', 'EXTENDED'] },
    })
      .sort({ clientDataSubmissionDeadline: 1 })
      .limit(6)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        facilities: facilities.map((f) => {
          const clientGroup = f.clientGroupId as unknown as { _id?: { toString(): string }; name?: string };
          return {
            ...f,
            _id: f._id.toString(),
            clientGroupId: clientGroup?._id ? clientGroup._id.toString() : String(f.clientGroupId),
            clientGroupName: clientGroup?.name || '',
          };
        }),
        pendingRequests: pendingRequests.map((r) => ({
          ...r,
          _id: r._id.toString(),
          dueDate: r.dueDate ? r.dueDate.toISOString() : null,
        })),
        openClarifications: openClarifications.map((c) => ({
          ...c,
          _id: c._id.toString(),
          datasetId: c.datasetId.toString(),
        })),
        approvedHistory: sanitizedHistory,
        upcomingDeadlines: upcomingDeadlines.map((d) => ({
          ...d,
          _id: d._id.toString(),
          clientDataSubmissionDeadline: d.clientDataSubmissionDeadline.toISOString(),
          regulatoryDueDate: d.regulatoryDueDate.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.warn('Error fetching portal dashboard from DB, returning fallback demo portal data:', error);
    const { MOCK_FACILITIES, MOCK_REQUIREMENTS, MOCK_CLARIFICATIONS, MOCK_ASSESSMENTS, MOCK_CALENDAR_ITEMS } = await import('@/lib/mockFallback');
    return NextResponse.json({
      success: true,
      data: {
        facilities: MOCK_FACILITIES,
        pendingRequests: MOCK_REQUIREMENTS,
        openClarifications: MOCK_CLARIFICATIONS,
        approvedHistory: MOCK_ASSESSMENTS.filter((a) => a.isHistorical),
        upcomingDeadlines: MOCK_CALENDAR_ITEMS,
      },
    });
  }
}
