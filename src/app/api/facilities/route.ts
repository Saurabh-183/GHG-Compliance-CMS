
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { UserModel } from '@/models/User';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import type { ComplianceType } from '@/types';
import { getSessionFromRequest, authorizeRole, signToken } from '@/lib/auth';
import {
  authorizedFacilityIdsForPortal,
  dedupeFacilitiesById,
  filterFacilitiesToPortalScope,
} from '@/lib/portalScope';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const portalScope = searchParams.get('portalScope') === 'authorized';

    let query: Record<string, unknown> = {};

    if (session.role === 'CLIENT') {
      const ids = authorizedFacilityIdsForPortal(session);
      if (session.clientGroupId) {
        query = ids.length
          ? { $or: [{ clientGroupId: session.clientGroupId }, { facilityId: { $in: ids } }] }
          : { clientGroupId: session.clientGroupId };
      } else if (ids.length) {
        query = { facilityId: { $in: ids } };
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    } else if (portalScope) {
      const ids = authorizedFacilityIdsForPortal(session);
      query = ids.length
        ? { facilityId: { $in: ids } }
        : { facilityId: '__NONE__' };
    }

    const clientGroupIdParam = searchParams.get('clientGroupId');

    if (clientGroupIdParam) {
      query.clientGroupId = clientGroupIdParam;
    }

    const facilities = await FacilityModel.find(query)
      .populate('clientGroupId', 'name code industry')
      .populate('assignedConsultantId', 'name email designation')
      .populate('assignedReviewerId', 'name email designation')
      .lean();

    // GET requests must not seed or reset persistent data.
    // Internal users receive the read-only demo directory fallback
    // below when MongoDB has no records.

    if (
      facilities.length === 0 &&
      process.env.NODE_ENV !== 'production' &&
      session.role === 'ADMIN'
    ) {
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');

      let fallbackList = MOCK_FACILITIES;

      if (clientGroupIdParam) {
        fallbackList = fallbackList.filter(
          (facility) => facility.clientGroupId === clientGroupIdParam
        );
      }

      return NextResponse.json({
        success: true,
        source: 'development-fallback',
        data: fallbackList,
      });
    }

    let data = dedupeFacilitiesById(
      facilities.map((f) => {
        const clientGroup = f.clientGroupId as unknown as {
          _id?: { toString(): string };
          name?: string;
        };

        return {
          ...f,
          ...(session.role === 'CLIENT' ? { driveConnection: undefined } : {}),
          _id: f._id.toString(),
          clientGroupId: clientGroup?._id
            ? clientGroup._id.toString()
            : String(f.clientGroupId),
          clientGroupName: clientGroup?.name || '',
        };
      })
    );

    if (portalScope) {
      data = filterFacilitiesToPortalScope(session, data);
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.warn('Error fetching facilities from DB:', error);

    if (
      session.role === 'CLIENT' &&
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Facility directory is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    if (
      process.env.NODE_ENV === 'production' ||
      session.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Facility directory is temporarily unavailable.',
        },
        { status: 503 }
      );
    }

    // Only ADMIN can reach this development fallback.
    // No CLIENT comparison is needed here because the role
    // has already been narrowed to ADMIN by the condition above.
    const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
    let fallbackList = MOCK_FACILITIES;
    const portalScope = request.nextUrl.searchParams.get('portalScope') === 'authorized';
    if (portalScope) {
      fallbackList = filterFacilitiesToPortalScope(session, MOCK_FACILITIES);
    }
    return NextResponse.json({
      success: true,
      source: 'development-fallback',
      data: MOCK_FACILITIES,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = getSessionFromRequest(request);

    if (!session || !authorizeRole(session, ['ADMIN', 'CLIENT'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins and Clients can register new facilities' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      facilityId?: string;
      name?: string;
      clientGroupId?: string;
      location?: string;
      category?: string;
      assignedConsultantId?: string;
      assignedReviewerId?: string;
      enabledFrameworks?: ComplianceType[];
      utilityConnection?: {
        consumerAccountNumber?: string;
        contractDemand?: string;
      };
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Facility name is required.' }, { status: 400 });
    }

    let targetClientGroupId = body.clientGroupId;
    if (session.role === 'CLIENT') {
      if (!session.clientGroupId) {
        return NextResponse.json({ error: 'Your client account is not assigned to a company group.' }, { status: 400 });
      }
      targetClientGroupId = session.clientGroupId;
    }

    if (!targetClientGroupId) {
      return NextResponse.json({ error: 'A company group is required to register a facility.' }, { status: 400 });
    }

    let rawFacilityId = typeof body.facilityId === 'string' ? body.facilityId.trim().toUpperCase() : '';
    if (!rawFacilityId) {
      rawFacilityId = name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toUpperCase()
        .slice(0, 24);
    }

    // Ensure uniqueness
    let uniqueFacilityId = rawFacilityId || 'FACILITY';
    let counter = 1;
    while (await FacilityModel.exists({ facilityId: uniqueFacilityId })) {
      uniqueFacilityId = `${rawFacilityId.slice(0, 20)}_${counter++}`;
    }

    let facilityCategory = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : '';
    if (!facilityCategory && targetClientGroupId) {
      const clientGroupDoc = await ClientGroupModel.findById(targetClientGroupId).lean();
      if (clientGroupDoc?.industry) {
        facilityCategory = clientGroupDoc.industry;
      }
    }
    if (!facilityCategory) {
      facilityCategory = 'Manufacturing';
    }

    let finalConsultantId = body.assignedConsultantId;
    if (!finalConsultantId && targetClientGroupId) {
      const assignedConsultant = await UserModel.findOne({
        role: 'CONSULTANT',
        clientGroupIds: targetClientGroupId,
      }).select('_id').lean();
      if (assignedConsultant) {
        finalConsultantId = assignedConsultant._id.toString();
      }
    }

    const validFrameworks: ComplianceType[] = ['RCO', 'PAT', 'CCTS'];
    const facilityEnabledFrameworks: ComplianceType[] =
      Array.isArray(body.enabledFrameworks)
        ? (body.enabledFrameworks.filter((f) => validFrameworks.includes(f as ComplianceType)) as ComplianceType[])
        : validFrameworks;

    if (facilityEnabledFrameworks.length === 0) {
      return NextResponse.json(
        { error: 'At least one statutory compliance framework (RCO, PAT, or CCTS) must be enabled for this facility.' },
        { status: 400 }
      );
    }

    const newFacility = await FacilityModel.create({
      facilityId: uniqueFacilityId,
      name,
      clientGroupId: targetClientGroupId,
      location: typeof body.location === 'string' && body.location.trim() ? body.location.trim() : 'India',
      category: facilityCategory,
      assignedConsultantId: finalConsultantId || undefined,
      assignedReviewerId: body.assignedReviewerId || undefined,
      enabledFrameworks: facilityEnabledFrameworks,
      status: 'ACTIVE',
      utilityConnection: body.utilityConnection
        ? {
            consumerAccountNumber: body.utilityConnection.consumerAccountNumber || '',
            contractDemand: body.utilityConnection.contractDemand || '',
          }
        : undefined,
    });

    try {
      const { generateFacilityApplicabilities } = await import('@/lib/complianceMatrixData');
      const defaultApps = generateFacilityApplicabilities(uniqueFacilityId, name);
      if (defaultApps.length > 0) {
        await ComplianceApplicabilityModel.insertMany(
          defaultApps.map((app) => ({
            facilityId: app.facilityId,
            complianceType: app.complianceType,
            period: app.period,
            isApplicable: facilityEnabledFrameworks.includes(app.complianceType),
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
          }))
        );
      }
    } catch (appErr) {
      console.warn('Facility initial applicability creation notice:', appErr);
    }

    // Update authorizedFacilityIds in UserModel for the creator
    if (session.userId) {
      await UserModel.updateOne(
        { _id: session.userId },
        { $addToSet: { authorizedFacilityIds: uniqueFacilityId } }
      );
    }

    // Also update consultant if assigned
    if (finalConsultantId) {
      await UserModel.updateOne(
        { _id: finalConsultantId },
        { $addToSet: { authorizedFacilityIds: uniqueFacilityId } }
      );
    }

    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({
        recipientRole: 'CONSULTANT',
        senderRole: session.role,
        senderName: session.name,
        type: 'FACILITY_CREATED',
        title: `New facility registered: ${body.name}`,
        message: `${session.name} registered operating unit ${body.name} (${uniqueFacilityId}).`,
        facilityId: uniqueFacilityId,
        linkUrl: `/facilities/${uniqueFacilityId}`,
        isRead: false,
      });
      await Notification.create({
        recipientRole: 'ADMIN',
        senderRole: session.role,
        senderName: session.name,
        type: 'FACILITY_CREATED',
        title: `New facility registered: ${body.name}`,
        message: `${session.name} registered operating unit ${body.name} (${uniqueFacilityId}).`,
        facilityId: uniqueFacilityId,
        linkUrl: `/clients`,
        isRead: false,
      });
    } catch (notifErr) {
      console.warn('Facility notification warning:', notifErr);
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Facility created successfully',
        data: newFacility,
      },
      { status: 201 }
    );

    // If client created the facility, refresh their session token with the new facility ID
    if (session.role === 'CLIENT') {
      const updatedAuthorizedFacilityIds = Array.from(
        new Set([...(session.authorizedFacilityIds || []), uniqueFacilityId])
      );
      const updatedPayload = {
        ...session,
        authorizedFacilityIds: updatedAuthorizedFacilityIds,
      };
      const token = signToken(updatedPayload);
      response.cookies.set('cc_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error('Facility creation failed:', error);

    return NextResponse.json(
      { error: 'Unable to create facility.' },
      { status: 500 }
    );
  }
}
