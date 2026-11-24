
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, isMongoObjectId } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { DataRequirementModel } from '@/models/DataRequirement';
import { ClarificationModel } from '@/models/Clarification';
import { AssessmentModel } from '@/models/Assessment';
import { CalendarItemModel } from '@/models/CalendarItem';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { extractPortalDeadlineAlerts } from '@/lib/deadlineReminders';
import {
  authorizedFacilityIdsForPortal,
  dedupeFacilitiesById,
  filterFacilitiesToPortalScope,
} from '@/lib/portalScope';

async function buildPortalFacilityQuery(session: ReturnType<typeof getSessionFromRequest>) {
  const portalFacilityIds = authorizedFacilityIdsForPortal(session);
  const filter: Record<string, unknown> =
    portalFacilityIds.length > 0
      ? { facilityId: { $in: portalFacilityIds } }
      : { facilityId: '__NONE__' };

  if (session?.role === 'CLIENT' && session.clientGroupId) {
    if (isMongoObjectId(session.clientGroupId)) {
      filter.clientGroupId = session.clientGroupId;
    } else {
      const group = await ClientGroupModel.findOne({
        code: session.clientGroupId.trim().toUpperCase(),
      })
        .select('_id')
        .lean();
      if (group?._id) filter.clientGroupId = group._id;
    }
  }

  return { filter, portalFacilityIds };
}

function toSafeIso(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? String(val) : d.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the request.
    const session = getSessionFromRequest(request);
    const facilityIdParam = request.nextUrl.searchParams.get('facilityId')?.toUpperCase();
    const periodParam = request.nextUrl.searchParams.get('period')?.trim();

    const { filter: facilityFilter } = await buildPortalFacilityQuery(session);

    const facilitiesRaw = await FacilityModel.find(facilityFilter)
      .populate('clientGroupId', 'name code industry')
      .lean();

    const mapFacilityRow = (f: (typeof facilitiesRaw)[number]) => {
      const clientGroup = f.clientGroupId as unknown as { _id?: { toString(): string }; name?: string };
      return {
        ...f,
        _id: f._id.toString(),
        clientGroupId: clientGroup?._id ? clientGroup._id.toString() : String(f.clientGroupId),
        clientGroupName: clientGroup?.name || '',
      };
    };

    const portalFacilityIds = authorizedFacilityIdsForPortal(session);
    const portalAllowedSet = new Set(portalFacilityIds.map((id) => id.toUpperCase()));

    let facilitiesUnique = filterFacilitiesToPortalScope(session, facilitiesRaw.map(mapFacilityRow));

    let facilityIds = facilitiesUnique.map((f) => f.facilityId);

    if (facilityIdParam) {
      if (session && !isAuthorizedForFacility(session, facilityIdParam)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const inList = facilitiesUnique.some((f) => f.facilityId === facilityIdParam);
      if (!inList && portalAllowedSet.has(facilityIdParam)) {
        const extraQuery: Record<string, unknown> = { facilityId: facilityIdParam };
        if (typeof facilityFilter.clientGroupId !== 'undefined') {
          extraQuery.clientGroupId = facilityFilter.clientGroupId;
        }
        const extra = await FacilityModel.findOne(extraQuery)
          .populate('clientGroupId', 'name code industry')
          .lean();
        if (extra) {
          facilitiesUnique = filterFacilitiesToPortalScope(session, [
            ...facilitiesUnique,
            mapFacilityRow(extra),
          ]);
        }
      }

      const resolved = facilitiesUnique.some((f) => f.facilityId === facilityIdParam);
      const portalAllowed = portalAllowedSet.has(facilityIdParam);
      if (resolved && portalAllowed) {
        facilityIds = [facilityIdParam];
      } else if (session && isAuthorizedForFacility(session, facilityIdParam) && portalAllowed) {
        facilityIds = [facilityIdParam];
      } else if (portalAllowed) {
        facilityIds = [facilityIdParam];
      } else {
        return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
      }
    }

    const periodFilter = periodParam ? { period: periodParam } : {};

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
      ...periodFilter,
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
      ...periodFilter,
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
      status: { $in: ['UPCOMING', 'PENDING', 'EXTENDED'] },
      ...(periodParam ? { reportingPeriod: periodParam } : {}),
    })
      .sort({ clientDataSubmissionDeadline: 1 })
      .limit(6)
      .lean();

    // 10. Return dashboard data.
    // 9. Return dashboard data.
    return NextResponse.json({
      success: true,
      data: {
        facilities: facilitiesUnique,
        pendingRequests: pendingRequests.map((r) => ({
          ...r,
          _id: r._id.toString(),
          dueDate: toSafeIso(r.dueDate),
        })),

        openClarifications: openClarifications.map((clarification) => ({
          ...clarification,
          _id: clarification._id.toString(),
          datasetId: clarification.datasetId
            ? clarification.datasetId.toString()
            : null,
        })),

        approvedHistory: sanitizedHistory,

        upcomingDeadlines: upcomingDeadlines.map((deadline) => ({
          ...deadline,
          _id: deadline._id.toString(),
          clientDataSubmissionDeadline: toSafeIso(
            deadline.clientDataSubmissionDeadline
          ),
          regulatoryDueDate: toSafeIso(deadline.regulatoryDueDate),
        })),
        deadlineAlerts: extractPortalDeadlineAlerts(pendingRequests as any),
      },
    });
  } catch (error) {
    console.warn('Error fetching portal dashboard from DB, returning fallback demo portal data:', error);
    const session = getSessionFromRequest(request);
    const { MOCK_FACILITIES, MOCK_REQUIREMENTS, MOCK_CLARIFICATIONS, MOCK_ASSESSMENTS, MOCK_CALENDAR_ITEMS } = await import('@/lib/mockFallback');
    const scopedFacilities = filterFacilitiesToPortalScope(session, MOCK_FACILITIES);
    const scopedFacilityIds = new Set(scopedFacilities.map((f) => f.facilityId.toUpperCase()));
    return NextResponse.json({
      success: true,
      data: {
        facilities: scopedFacilities,
        pendingRequests: MOCK_REQUIREMENTS.filter((r) =>
          scopedFacilityIds.has((r.facilityId || '').toUpperCase())
        ),
        openClarifications: MOCK_CLARIFICATIONS.filter((c) =>
          scopedFacilityIds.has((c.facilityId || '').toUpperCase())
        ),
        approvedHistory: MOCK_ASSESSMENTS.filter(
          (a) => a.isHistorical && scopedFacilityIds.has((a.facilityId || '').toUpperCase())
        ),
        upcomingDeadlines: MOCK_CALENDAR_ITEMS.filter((d) =>
          scopedFacilityIds.has((d.facilityId || '').toUpperCase())
        ),
      },
    });
  }
}
