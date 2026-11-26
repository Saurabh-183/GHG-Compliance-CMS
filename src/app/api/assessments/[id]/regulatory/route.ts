import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { RegulatorySubmissionModel } from '@/models/RegulatorySubmission';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { getRegulatoryTemplate, calculateRegulatoryValues } from '@/lib/regulatory/regulatoryTemplates';
import { Notification } from '@/models/Notification';
import { FacilityModel } from '@/models/Facility';
import { UserModel } from '@/models/User';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';
import { parseAssessmentId } from '@/lib/assessmentIds';

type Ctx = { params: Promise<{ id: string }> };
const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });

async function getAssessmentAndSession(
  request: NextRequest,
  id: string,
  allowCreateFromMatrixId = false
) {
  const session = getSessionFromRequest(request);
  if (!session) return { error: jsonError('Authentication required', 401) } as const;
  if (!id?.trim()) return { error: jsonError('Assessment ID is required', 400) } as const;

  await connectToDatabase();
  let assessment: any = null;
  if (mongoose.isValidObjectId(id)) {
    assessment = await AssessmentModel.findById(id);
  }
  if (!assessment) {
    assessment = await AssessmentModel.findOne({ _id: id });
  }

  const { parseAssessmentId } = await import('@/lib/assessmentIds');
  const parsed = parseAssessmentId(id);

  if (!assessment && parsed) {
    assessment = await AssessmentModel.findOne({
      facilityId: parsed.facilityId,
      complianceType: parsed.complianceType,
      period: parsed.period,
    });
  }

  if (!assessment && parsed) {
    // Lazy-create an empty assessment only when the exact facility/framework/year
    // has been explicitly configured as applicable. Never synthesize a report
    // for a Not Applicable matrix cell.
    const applicability = await ComplianceApplicabilityModel.findOne({
      facilityId: parsed.facilityId.toUpperCase(),
      complianceType: parsed.complianceType,
      period: parsed.period,
      isApplicable: true,
    }).lean();

    if (!applicability) {
      return { error: jsonError('This compliance framework and financial year are not applicable for this facility.', 404) } as const;
    }

    assessment = await AssessmentModel.findOneAndUpdate(
      {
        facilityId: parsed.facilityId.toUpperCase(),
        complianceType: parsed.complianceType,
        period: parsed.period,
      },
      {
        $setOnInsert: {
          facilityId: parsed.facilityId.toUpperCase(),
          complianceType: parsed.complianceType,
          period: parsed.period,
          workflowStatus: 'NOT_STARTED',
          complianceOutcome: 'PENDING_DETERMINATION',
          isHistorical: false,
          version: 1,
          documentLinks: {},
          metrics: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (!assessment) return { error: jsonError('Assessment not found', 404) } as const;

  // Existing legacy assessments are also blocked when their exact applicability
  // has since been disabled; checking only the lazy-create branch is insufficient.
  const activeApplicability = await ComplianceApplicabilityModel.findOne({
    facilityId: String(assessment.facilityId).toUpperCase(),
    complianceType: assessment.complianceType,
    period: assessment.period,
    isApplicable: true,
  }).lean();
  if (!activeApplicability) {
    return { error: jsonError('This compliance framework and financial year are not applicable for this facility.', 404) } as const;
  }

  if (!isAuthorizedForFacility(session, assessment.facilityId)) {
    return { error: jsonError('You are not authorized for this facility', 403) } as const;
  }
  return { session, assessment } as const;
}

function cleanValues(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('values must be an object');
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > 500) throw new Error('Too many regulatory fields');
  const output: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,100}$/.test(key)) throw new Error(`Invalid field key: ${key}`);
    if (value === null || value === '') { output[key] = ''; continue; }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error(`${key} must be a finite number`);
      output[key] = value;
    } else if (typeof value === 'string') {
      if (value.length > 2000) throw new Error(`${key} is too long`);
      output[key] = value.trim();
    } else if (typeof value === 'boolean') {
      output[key] = value;
    } else {
      throw new Error(`${key} has an unsupported value type`);
    }
  }
  return output;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ctx = await getAssessmentAndSession(request, id);
    if ('error' in ctx) return ctx.error;
    const submission = await RegulatorySubmissionModel.findOne({ assessmentId: ctx.assessment._id }).lean();
    return NextResponse.json({
      success: true,
      assessment: {
        _id: String(ctx.assessment._id),
        facilityId: ctx.assessment.facilityId,
        framework: ctx.assessment.complianceType,
        period: ctx.assessment.period
      },
      submission
    });
  } catch (error) {
    console.error('Regulatory GET failed:', error);
    return jsonError('Unable to load regulatory submission', 500);
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ctx = await getAssessmentAndSession(request, id);
    if ('error' in ctx) return ctx.error;
    if (!authorizeRole(ctx.session, ['CLIENT'])) return jsonError('Only the client can enter or edit facility regulatory values',403);
    const body = await request.json();
    const framework = ctx.assessment.complianceType as 'RCO' | 'RPO' | 'PAT' | 'CCTS';
    if (!['RCO','RPO','PAT','CCTS'].includes(framework)) return jsonError('This assessment type does not support regulatory summary sheets',400);
    const template = getRegulatoryTemplate(String(body.templateId || ''));
    if (!template || template.framework !== framework) return jsonError('Select a valid template for this assessment framework',400);
    const existing = await RegulatorySubmissionModel.findOne({ assessmentId: ctx.assessment._id });
    if (!existing || !['REQUESTED','DRAFT','RETURNED'].includes(existing.status)) {
      return jsonError('A consultant must request this regulatory summary before the client can enter data',409);
    }
    if (existing.templateId !== template.id) return jsonError('The client must complete the summary sheet selected by the consultant',409);
    if (existing && !['REQUESTED','DRAFT','RETURNED'].includes(existing.status)) {
      return jsonError('This submission is locked while submitted, under review, verified or approved. Return it for correction before editing.',409);
    }
    const values = cleanValues(body.values);
    const evidence = Array.isArray(body.evidence) ? body.evidence.slice(0,100).map((item: any) => {
      const url = String(item?.url || '').trim();
      if (!/^https?:\/\/\S+/i.test(url)) throw new Error('Evidence links must be valid http(s) URLs');
      return { title: String(item?.title || 'Supporting document').slice(0,200), url, note: String(item?.note || '').slice(0,1000) };
    }) : [];
    const calculated = calculateRegulatoryValues(template.id, values);
    const mergedValues = { ...values, ...calculated };
    const existingValues = existing?.values && typeof existing.values === 'object'
      ? (typeof (existing.values as any).toObject === 'function'
          ? (existing.values as any).toObject()
          : existing.values)
      : {};
    const valuesChanged = JSON.stringify(existingValues) !== JSON.stringify(mergedValues);
    const evidenceChanged = JSON.stringify(existing?.evidence || []) !== JSON.stringify(evidence);
    const invalidateReviews = valuesChanged || evidenceChanged;
    const audit = {
      at: new Date(), userId: ctx.session.userId, userName: ctx.session.name,
      action: 'SAVE_DRAFT', details: `Saved ${template.title} (${template.id})`
    };
    const submission = await RegulatorySubmissionModel.findOneAndUpdate(
      { assessmentId: ctx.assessment._id },
      {
  $set: {
    facilityId: ctx.assessment.facilityId,
    framework,
    templateId: template.id,
    period: ctx.assessment.period,
    values: mergedValues,
    evidence,
    status: existing?.status === 'RETURNED' ? 'RETURNED' : 'DRAFT',
    fieldReviews: invalidateReviews
      ? []
      : (existing?.fieldReviews || [])
  },
  $inc: { version: 1 },
  $push: { auditTrail: audit }
},
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Regulatory PUT failed:', error);
    return jsonError(error instanceof Error ? error.message : 'Unable to save regulatory submission',400);
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ctx = await getAssessmentAndSession(request, id);
    if ('error' in ctx) return ctx.error;
    const submission = await RegulatorySubmissionModel.findOne({ assessmentId: ctx.assessment._id });
    if (!submission) return jsonError('Save a regulatory draft before submitting',409);
    if (submission.status === 'APPROVED') return jsonError('Approved submissions cannot be resubmitted',409);
    if (ctx.session.role !== 'CLIENT') return jsonError('Only the client can submit facility data',403);
    if (!['REQUESTED','DRAFT','RETURNED'].includes(submission.status)) return jsonError('This submission is not open for client submission',409);
    const template = getRegulatoryTemplate(submission.templateId);
    if (!template) return jsonError('The saved template is no longer available',409);
    const missing = template.sections.flatMap(section => section.fields)
      .filter(field => field.required && field.columns.every((column) => { const key = column === 'VALUE' ? field.key : `${field.key}__${column}`; const value = (submission.values as Record<string,unknown>)[key]; return value === undefined || value === ''; }))
      .map(field => field.label);
    if (missing.length) return NextResponse.json({ error: 'Required fields are missing', fields: missing }, { status: 400 });
    submission.status = 'SUBMITTED';
    submission.submittedAt = new Date();
    submission.submittedBy = ctx.session.userId;
    submission.version += 1;
    submission.auditTrail.push({
      at: new Date(), userId: ctx.session.userId, userName: ctx.session.name,
      action: 'SUBMIT', details: 'Submitted regulatory summary for review'
    });
    await submission.save();
    try {
      await Notification.create({
        recipientRole: 'CONSULTANT', senderRole: 'CLIENT', senderName: ctx.session.name,
        type: 'REGULATORY_SUBMITTED', title: `${submission.framework} summary sheet submitted`,
        message: `${ctx.session.name} submitted ${template.title} for ${submission.facilityId} (${submission.period}).`,
        facilityId: submission.facilityId, linkUrl: `/assessments/${ctx.assessment._id}`, isRead: false,
      });
    } catch (notificationError) { console.error('Regulatory submission notification failed:', notificationError); }
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Regulatory submit failed:', error);
    return jsonError('Unable to submit regulatory report',500);
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ctx = await getAssessmentAndSession(request, id, true);
    if ('error' in ctx) return ctx.error;
    if (!authorizeRole(ctx.session, ['ADMIN','CONSULTANT'])) return jsonError('Only consultants and admins can manage regulatory requests and reviews',403);
    const body = await request.json();
    const action = String(body.action || '');
    let submission = await RegulatorySubmissionModel.findOne({ assessmentId: ctx.assessment._id });
    if (action === 'REQUEST_DATA') {
      const framework = ctx.assessment.complianceType as 'RCO' | 'RPO' | 'PAT' | 'CCTS';
      const template = getRegulatoryTemplate(String(body.templateId || ''));
      if (!template || template.framework !== framework) return jsonError('Choose a valid summary sheet for this assessment framework',400);
      if (submission && ['REQUESTED','SUBMITTED','UNDER_REVIEW','RETURNED','VERIFIED','APPROVED'].includes(submission.status)) return jsonError('A submitted or approved report cannot be replaced with a new request',409);
      const now = new Date();
      submission = await RegulatorySubmissionModel.findOneAndUpdate(
        { assessmentId: ctx.assessment._id },
        { $set: { facilityId: ctx.assessment.facilityId, framework, templateId: template.id, period: ctx.assessment.period, status: 'REQUESTED', values: {}, evidence: [], fieldReviews: [], requestedAt: now, requestedBy: ctx.session.userId, requestedByName: ctx.session.name, requestMessage: String(body.message || '').slice(0,2000) }, $inc: { version: 1 }, $push: { auditTrail: { at: now, userId: ctx.session.userId, userName: ctx.session.name, action: 'REQUEST_DATA', details: `Requested ${template.title} from client` } } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      try {
        // Target the client users belonging to this facility's company. This
        // makes the request visible in the correct client account even when
        // the user's authorizedFacilityIds were not manually populated.
        const facility = await FacilityModel.findOne({ facilityId: ctx.assessment.facilityId })
          .select('clientGroupId')
          .lean();
        const clientQuery: Record<string, unknown> = {
          role: 'CLIENT',
          status: { $ne: 'DISABLED' },
          authorizedFacilityIds: ctx.assessment.facilityId,
        };
        if (facility?.clientGroupId) {
          clientQuery.$or = [
            { clientGroupId: facility.clientGroupId },
            { authorizedFacilityIds: ctx.assessment.facilityId },
          ];
          delete clientQuery.authorizedFacilityIds;
        }
        const clientUsers = await UserModel.find(clientQuery).select('_id').lean();
        const notificationBase = {
          recipientRole: 'CLIENT' as const,
          senderRole: 'CONSULTANT' as const,
          senderName: ctx.session.name,
          type: 'REGULATORY_DATA_REQUESTED' as const,
          title: `${framework} data requested`,
          message: `${ctx.session.name} requested ${template.title} for ${ctx.assessment.facilityId} (${ctx.assessment.period}). Open this notification to complete the requested summary sheet.`,
          facilityId: ctx.assessment.facilityId,
          linkUrl: `/portal/regulatory/${ctx.assessment._id}`,
          isRead: false,
        };
        if (clientUsers.length) {
          await Notification.insertMany(clientUsers.map((client: { _id: { toString(): string } }) => ({
            ...notificationBase,
            recipientUserId: client._id.toString(),
          })));
        } else {
          // Role/facility-scoped fallback for installations where client user
          // provisioning is still being completed.
          await Notification.create(notificationBase);
        }
      } catch (notificationError) { console.error('Regulatory request notification failed:', notificationError); }
      return NextResponse.json({ success: true, submission, message: 'Regulatory data request sent to client.' });
    }
    if (!submission) return jsonError('Regulatory submission not found',404);
    const auditBase = { at: new Date(), userId: ctx.session.userId, userName: ctx.session.name };
    if (action === 'START_REVIEW') {
      if (submission.status !== 'SUBMITTED') return jsonError('Only submitted reports can enter review',409);
      submission.status = 'UNDER_REVIEW';
      submission.auditTrail.push({ ...auditBase, action, details: 'Review started' });
    } else if (
      action === 'VERIFY_FIELD' ||
      action === 'REJECT_FIELD' ||
      action === 'VERIFY_ALL'
    ) {
      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
        return jsonError('Report is not open for field review', 409);
      }

      const template = getRegulatoryTemplate(submission.templateId);
      if (!template) return jsonError('Regulatory template not found', 404);

      const inputFields = template.sections
        .flatMap(section => section.fields)
        .filter(field => field.input !== false);
      const values = submission.values as Record<string, unknown>;
      const reviews = [
        ...((submission.fieldReviews || []) as Array<Record<string, any>>),
      ];
      const now = new Date();
      const fieldHasValue = (field: typeof inputFields[number]) =>
        field.columns.some(column => {
          const key = column === 'VALUE' ? field.key : `${field.key}__${column}`;
          const value = values[key];
          return value !== undefined && value !== null && value !== '';
        });
      const eligibleFields = inputFields.filter(field => field.required || fieldHasValue(field));
      const missingRequired = inputFields.filter(field =>
        field.required && field.columns.every(column => {
          const key = column === 'VALUE' ? field.key : `${field.key}__${column}`;
          const value = values[key];
          return value === undefined || value === null || value === '';
        })
      );

      if (action === 'VERIFY_ALL') {
        if (missingRequired.length) {
          return NextResponse.json(
            {
              error: 'Complete all required fields before verifying the report.',
              fields: missingRequired.map(field => field.label),
            },
            { status: 409 }
          );
        }
        if (!eligibleFields.length) {
          return jsonError('There are no populated input fields available to verify.', 409);
        }
        for (const field of eligibleFields) {
          const review = {
            fieldKey: field.key,
            status: 'VERIFIED',
            reviewedBy: ctx.session.userId,
            reviewedByName: ctx.session.name,
            reviewedAt: now,
            comments: 'Verified as part of bulk verification.',
          };
          const index = reviews.findIndex(item => item.fieldKey === field.key);
          if (index >= 0) reviews[index] = review;
          else reviews.push(review);
        }
        submission.auditTrail.push({
          ...auditBase,
          action: 'VERIFY_ALL',
          details: `Bulk verified ${eligibleFields.length} input fields.`,
        });
      } else {
        const field = inputFields.find(item => item.key === body.fieldKey);
        if (!field) return jsonError('Unknown or non-reviewable regulatory field', 400);
        if (!fieldHasValue(field)) {
          return jsonError('This field has no entered value and cannot be verified.', 409);
        }
        const review = {
          fieldKey: field.key,
          status: action === 'VERIFY_FIELD' ? 'VERIFIED' : 'REJECTED',
          reviewedBy: ctx.session.userId,
          reviewedByName: ctx.session.name,
          reviewedAt: now,
          comments: String(body.comments || '').slice(0, 2000),
        };
        const index = reviews.findIndex(item => item.fieldKey === field.key);
        if (index >= 0) reviews[index] = review;
        else reviews.push(review);
        submission.auditTrail.push({
          ...auditBase,
          action,
          details: `${field.label}: ${review.status}`,
        });
      }

      submission.fieldReviews = reviews as typeof submission.fieldReviews;
      const allVerified = eligibleFields.length > 0 && eligibleFields.every(field =>
        reviews.some(item => item.fieldKey === field.key && item.status === 'VERIFIED')
      );
      submission.status = allVerified ? 'VERIFIED' : 'UNDER_REVIEW';
      if (allVerified) {
        submission.auditTrail.push({
          ...auditBase,
          action: 'REPORT_VERIFIED',
          details: 'All eligible input fields have been verified.',
        });
      }
    } else if (action === 'RETURN') {
      if (!['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(submission.status)) return jsonError('Only submitted, under-review or verified reports can be returned',409);
      submission.status = 'RETURNED';
      submission.fieldReviews = [];
      submission.auditTrail.push({ ...auditBase, action, details: String(body.comments || 'Returned for correction').slice(0,2000) });
    } else if (action === 'VERIFY_REPORT') {
      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
        return jsonError('Report is not open for verification', 409);
      }
      const template = getRegulatoryTemplate(submission.templateId);
      if (!template) return jsonError('Regulatory template not found', 404);
      const fields = template.sections.flatMap(section => section.fields).filter(field => field.input !== false);
      const values = submission.values as Record<string, unknown>;
      const eligible = fields.filter(field => field.required || field.columns.some(column => {
        const key = column === 'VALUE' ? field.key : `${field.key}__${column}`;
        const value = values[key];
        return value !== undefined && value !== null && value !== '';
      }));
      const reviews = (submission.fieldReviews || []) as Array<Record<string, unknown>>;
      const pending = eligible.filter(field => !reviews.some(item => item.fieldKey === field.key && item.status === 'VERIFIED'));
      const missing = fields.filter(field => field.required && field.columns.every(column => {
        const key = column === 'VALUE' ? field.key : `${field.key}__${column}`;
        const value = values[key];
        return value === undefined || value === null || value === '';
      }));
      if (missing.length || pending.length) {
        return NextResponse.json({
          error: 'All required fields must be complete and all eligible fields must be verified.',
          fields: [...new Set([...missing, ...pending].map(field => field.label))],
        }, { status: 409 });
      }
      if (!eligible.length) return jsonError('There are no populated input fields available to verify.', 409);
      submission.status = 'VERIFIED';
      submission.auditTrail.push({ ...auditBase, action, details: 'All eligible input fields verified' });
    } else if (action === 'APPROVE') {
      if (!authorizeRole(ctx.session, ['ADMIN', 'CONSULTANT'])) return jsonError('Only a consultant or admin can approve the final regulatory report',403);
      if (submission.status !== 'VERIFIED') return jsonError('Verify the report before final approval',409);
      submission.status = 'APPROVED';
      submission.approvedAt = new Date();
      submission.approvedBy = ctx.session.userId;
      submission.auditTrail.push({ ...auditBase, action, details: 'Final regulatory report approved' });
    } else {
      return jsonError('Unsupported review action',400);
    }
    submission.version += 1;
    await submission.save();
    if (action === 'APPROVE' || action === 'RETURN') {
      try {
        const approved = action === 'APPROVE';
        await Notification.create({
          recipientRole: 'CLIENT', senderRole: 'CONSULTANT', senderName: ctx.session.name,
          type: approved ? 'REGULATORY_APPROVED' : 'REGULATORY_RETURNED',
          title: approved ? `${submission.framework} summary sheet approved` : `${submission.framework} summary sheet returned for correction`,
          message: approved
            ? `${ctx.session.name} approved ${submission.templateId} for ${submission.facilityId} (${submission.period}). Approved values are now available in the compliance assessment.`
            : `${ctx.session.name} returned ${submission.templateId} for ${submission.facilityId} (${submission.period}). ${String(body.comments || 'Please review the consultant feedback and correct the values.')}`,
          facilityId: submission.facilityId, linkUrl: `/portal/regulatory/${ctx.assessment._id}`, isRead: false,
        });
      } catch (notificationError) { console.error('Regulatory review notification failed:', notificationError); }
    }
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Regulatory review failed:', error);
    return jsonError('Unable to update regulatory review',500);
  }
}
