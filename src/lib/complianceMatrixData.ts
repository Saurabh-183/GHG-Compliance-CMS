import { getRollingFinancialYears, normalizeFinancialYearPeriod } from '@/lib/financialYears';
import type {
  ComplianceType,
  IComplianceMatrixCell,
  IComplianceApplicability,
  IAssessment,
  WorkflowStatus,
} from '@/types';

/**
 * Matrix rows are a live view of the rolling previous/current/upcoming FYs.
 * Historical records stay in MongoDB but are not expanded into active columns.
 */
export const COMPLIANCE_FRAMEWORKS: ComplianceType[] = ['RCO', 'RPO', 'PAT', 'CCTS'];
export const COMPLIANCE_PERIODS = getRollingFinancialYears();

/** Call at request/render time when the current FY must be recalculated. */
export function getCompliancePeriods(): string[] {
  return getRollingFinancialYears();
}

const WORKFLOW_STATUS_RANK: Record<string, number> = {
  NOT_STARTED: 0,
  DATA_COLLECTION: 1,
  UNDER_REVIEW: 2,
  APPROVED: 3,
  SUBMITTED: 4,
};

function resolveMatrixPeriod(period: string): string | undefined {
  const normalized = normalizeFinancialYearPeriod(period);
  return normalized && getCompliancePeriods().includes(normalized) ? normalized : undefined;
}

function preferWorkflowStatus(current: WorkflowStatus, next: WorkflowStatus): WorkflowStatus {
  const currentRank = WORKFLOW_STATUS_RANK[current] ?? 0;
  const nextRank = WORKFLOW_STATUS_RANK[next] ?? 0;
  return nextRank >= currentRank ? next : current;
}

/** Kept for backwards compatibility. No defaults are fabricated. */
export function generateFacilityApplicabilities(
  _facilityId: string,
  _facilityName?: string
): IComplianceApplicability[] {
  return [];
}

/** Kept for backwards compatibility. Assessments must be real DB records. */
export function generateFacilityAssessments(
  _facilityId: string,
  _facilityName?: string
): IAssessment[] {
  return [];
}

export function buildMultiYearComplianceMatrix(
  facilityId: string,
  _facilityName?: string,
  existingApplicabilities: IComplianceApplicability[] = [],
  existingAssessments: IAssessment[] = []
): {
  matrix: Record<ComplianceType, Record<string, IComplianceMatrixCell>>;
  applicabilities: IComplianceApplicability[];
  assessments: IAssessment[];
} {
  const periods = getCompliancePeriods();
  const cleanId = String(facilityId || '').toUpperCase();
  const applicabilities = existingApplicabilities.filter(
    (app) => String(app.facilityId || '').toUpperCase() === cleanId
  );
  const assessments = existingAssessments.filter(
    (assessment) => String(assessment.facilityId || '').toUpperCase() === cleanId
  );

  const assessmentMap = new Map<string, string>();
  for (const assessment of assessments) {
    const period = resolveMatrixPeriod(assessment.period);
    if (period) assessmentMap.set(`${assessment.complianceType}_${period}`, String(assessment._id));
  }

  const matrix: Record<ComplianceType, Record<string, IComplianceMatrixCell>> = {
    RCO: {}, RPO: {}, PAT: {}, CCTS: {},
  };

  for (const framework of COMPLIANCE_FRAMEWORKS) {
    for (const period of periods) {
      matrix[framework][period] = {
        period,
        complianceType: framework,
        isApplicable: false,
        workflowStatus: 'NOT_STARTED',
        complianceOutcome: 'NOT_APPLICABLE',
      };
    }
  }

  // Applicability for an exact facility + framework + FY is the source of truth.
  for (const app of applicabilities) {
    const framework = app.complianceType as ComplianceType;
    const period = resolveMatrixPeriod(app.period);
    if (!period || !matrix[framework] || !app.isApplicable) continue;

    const assessmentId = assessmentMap.get(`${framework}_${period}`);
    matrix[framework][period] = {
      period,
      complianceType: framework,
      isApplicable: true,
      workflowStatus: app.workflowStatus,
      complianceOutcome: app.complianceOutcome,
      ...(assessmentId ? { assessmentId } : {}),
      ...(app.deadline ? { deadline: app.deadline } : {}),
    };
  }

  // Overlay status only from real assessments; never fabricate assessment IDs.
  for (const assessment of assessments) {
    const framework = assessment.complianceType as ComplianceType;
    const period = resolveMatrixPeriod(assessment.period);
    if (!period || !matrix[framework]) continue;
    const cell = matrix[framework][period];
    if (!cell.isApplicable) continue;
    cell.workflowStatus = preferWorkflowStatus(cell.workflowStatus, assessment.workflowStatus);
    cell.complianceOutcome = assessment.complianceOutcome;
    cell.assessmentId = String(assessment._id);
  }

  return { matrix, applicabilities, assessments };
}

export function resolveAssessmentById(_id: string, _facilityName?: string): IAssessment | null {
  return null;
}
