import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { RegulatorySubmissionModel } from '@/models/RegulatorySubmission';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { getRegulatoryTemplate, calculateRegulatoryValues } from '@/lib/regulatory/regulatoryTemplates';

type Ctx = { params: Promise<{ id: string }> };
const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });

async function getAssessmentAndSession(request: NextRequest, id: string) {
  const session = getSessionFromRequest(request);
  if (!session) return { error: jsonError('Authentication required', 401) } as const;
  if (!mongoose.isValidObjectId(id)) return { error: jsonError('Invalid assessment ID', 400) } as const;
  await connectToDatabase();
  const assessment = await AssessmentModel.findById(id);
  if (!assessment) return { error: jsonError('Assessment not found', 404) } as const;
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
    const framework = ctx.assessment.complianceType as 'RCO' | 'PAT' | 'CCTS';
    if (!['RCO','PAT','CCTS'].includes(framework)) return jsonError('This assessment type does not support regulatory summary sheets',400);
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
    const audit = {
      at: new Date(), userId: ctx.session.userId, userName: ctx.session.name,
      action: 'SAVE_DRAFT', details: `Saved ${template.title} (${template.id})`
    };
    const submission = await RegulatorySubmissionModel.findOneAndUpdate(
      { assessmentId: ctx.assessment._id },
      {
        $set: {
          facilityId: ctx.assessment.facilityId, framework, templateId: template.id,
          period: ctx.assessment.period, values: mergedValues, evidence,
          status: existing?.status === 'RETURNED' ? 'RETURNED' : 'DRAFT'
        },
        $inc: { version: 1 },
        $push: { auditTrail: audit },
        $setOnInsert: { fieldReviews: [] }
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
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Regulatory submit failed:', error);
    return jsonError('Unable to submit regulatory report',500);
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ctx = await getAssessmentAndSession(request, id);
    if ('error' in ctx) return ctx.error;
    if (!authorizeRole(ctx.session, ['ADMIN','CONSULTANT'])) return jsonError('Only consultants and admins can manage regulatory requests and reviews',403);
    const body = await request.json();
    const action = String(body.action || '');
    let submission = await RegulatorySubmissionModel.findOne({ assessmentId: ctx.assessment._id });
    if (action === 'REQUEST_DATA') {
      const framework = ctx.assessment.complianceType as 'RCO' | 'PAT' | 'CCTS';
      const template = getRegulatoryTemplate(String(body.templateId || ''));
      if (!template || template.framework !== framework) return jsonError('Choose a valid summary sheet for this assessment framework',400);
      if (submission && ['REQUESTED','SUBMITTED','UNDER_REVIEW','RETURNED','VERIFIED','APPROVED'].includes(submission.status)) return jsonError('A submitted or approved report cannot be replaced with a new request',409);
      const now = new Date();
      submission = await RegulatorySubmissionModel.findOneAndUpdate(
        { assessmentId: ctx.assessment._id },
        { $set: { facilityId: ctx.assessment.facilityId, framework, templateId: template.id, period: ctx.assessment.period, status: 'REQUESTED', values: {}, evidence: [], fieldReviews: [], requestedAt: now, requestedBy: ctx.session.userId, requestedByName: ctx.session.name, requestMessage: String(body.message || '').slice(0,2000) }, $inc: { version: 1 }, $push: { auditTrail: { at: now, userId: ctx.session.userId, userName: ctx.session.name, action: 'REQUEST_DATA', details: `Requested ${template.title} from client` } } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return NextResponse.json({ success: true, submission, message: 'Regulatory data request sent to client.' });
    }
    if (!submission) return jsonError('Regulatory submission not found',404);
    const auditBase = { at: new Date(), userId: ctx.session.userId, userName: ctx.session.name };
    if (action === 'START_REVIEW') {
      if (submission.status !== 'SUBMITTED') return jsonError('Only submitted reports can enter review',409);
      submission.status = 'UNDER_REVIEW';
      submission.auditTrail.push({ ...auditBase, action, details: 'Review started' });
    } else if (action === 'VERIFY_FIELD' || action === 'REJECT_FIELD') {
      if (!['SUBMITTED','UNDER_REVIEW','RETURNED'].includes(submission.status)) return jsonError('Report is not open for field review',409);
      const template = getRegulatoryTemplate(submission.templateId);
      const field = template?.sections.flatMap(s => s.fields).find(f => f.key === body.fieldKey);
      if (!field) return jsonError('Unknown regulatory field',400);
      const review = {
        fieldKey: field.key, status: action === 'VERIFY_FIELD' ? 'VERIFIED' : 'REJECTED',
        reviewedBy: ctx.session.userId, reviewedByName: ctx.session.name,
        reviewedAt: new Date(), comments: String(body.comments || '').slice(0,2000)
      };
      const reviews = submission.fieldReviews as Array<Record<string,unknown>>;
      const idx = reviews.findIndex(r => r.fieldKey === field.key);
      if (idx >= 0) reviews[idx] = review; else reviews.push(review);
      submission.fieldReviews = reviews as typeof submission.fieldReviews;
      submission.status = 'UNDER_REVIEW';
      submission.auditTrail.push({ ...auditBase, action, details: `${field.label}: ${review.status}` });
    } else if (action === 'RETURN') {
      if (!['SUBMITTED','UNDER_REVIEW'].includes(submission.status)) return jsonError('Only submitted or under-review reports can be returned',409);
      submission.status = 'RETURNED';
      submission.auditTrail.push({ ...auditBase, action, details: String(body.comments || 'Returned for correction').slice(0,2000) });
    } else if (action === 'VERIFY_REPORT') {
      if (submission.status !== 'UNDER_REVIEW') return jsonError('Start review before verifying the report',409);
      const template = getRegulatoryTemplate(submission.templateId);
      const allFields = template?.sections.flatMap(s => s.fields).filter(f => f.input !== false) || [];
      const reviews = submission.fieldReviews as Array<Record<string,unknown>>;
      const pending = allFields.filter(f => !reviews.some(r => r.fieldKey === f.key && r.status === 'VERIFIED'));
      if (pending.length) return NextResponse.json({ error: 'Verify all input fields before verifying the report', fields: pending.map(f => f.label) }, { status: 409 });
      submission.status = 'VERIFIED';
      submission.auditTrail.push({ ...auditBase, action, details: 'All input fields verified' });
    } else if (action === 'APPROVE') {
      if (ctx.session.role !== 'ADMIN') return jsonError('Only an admin can approve the final regulatory report',403);
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
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Regulatory review failed:', error);
    return jsonError('Unable to update regulatory review',500);
  }
}
