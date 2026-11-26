import {
  ComplianceType,
  IComplianceMatrixCell,
  IComplianceApplicability,
  IAssessment,
  WorkflowStatus,
} from '@/types';

/**
 * Compliance matrix configuration.
 *
 * IMPORTANT: The matrix is a read model of explicitly configured applicability
 * and real assessment records. It must never invent historical applicability,
 * workflow statuses, evidence links, or assessment IDs.
 */
export const COMPLIANCE_FRAMEWORKS: ComplianceType[] = ['RCO', 'RPO', 'PAT', 'CCTS'];
export const COMPLIANCE_PERIODS = ['FY2024-25', 'FY2025-26', 'FY2026-27'];

const WORKFLOW_STATUS_RANK: Record<string, number> = {
  NOT_STARTED: 0,
  DATA_COLLECTION: 1,
  UNDER_REVIEW: 2,
  APPROVED: 3,
  SUBMITTED: 4,
};

function resolveMatrixPeriod(period: string): string | undefined {
  const normalized = String(period || '').trim().toLowerCase();
  const exact = COMPLIANCE_PERIODS.find((p) => p.toLowerCase() === normalized);
  if (exact) return exact;
  if (normalized.includes('2024-25')) return 'FY2024-25';
  if (normalized.includes('2025-26')) return 'FY2025-26';
  if (normalized.includes('2026-27')) return 'FY2026-27';
  return undefined;
}

function preferWorkflowStatus(current: WorkflowStatus, next: WorkflowStatus): WorkflowStatus {
  const currentRank = WORKFLOW_STATUS_RANK[current] ?? 0;
  const nextRank = WORKFLOW_STATUS_RANK[next] ?? 0;
  return nextRank >= currentRank ? next : current;
}

/** Kept for backwards compatibility with existing imports. No defaults are fabricated. */
export function generateFacilityApplicabilities(
  _facilityId: string,
  _facilityName?: string
): IComplianceApplicability[] {
  return [];
}

/** Kept for backwards compatibility with existing imports. Assessments must be real DB records. */
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
  const cleanId = String(facilityId || '').toUpperCase();
  const applicabilities = existingApplicabilities.filter(
    (app) => String(app.facilityId || '').toUpperCase() === cleanId && app.isApplicable === true
  );
  const assessments = existingAssessments.filter(
    (assessment) => String(assessment.facilityId || '').toUpperCase() === cleanId
  );

  const assessmentMap = new Map<string, string>();
  for (const assessment of assessments) {
    assessmentMap.set(
      `${assessment.complianceType}_${resolveMatrixPeriod(assessment.period) || assessment.period}`,
      String(assessment._id)
    );
  }

  const matrix: Record<ComplianceType, Record<string, IComplianceMatrixCell>> = {
    RCO: {}, RPO: {}, PAT: {}, CCTS: {},
  };

  for (const framework of COMPLIANCE_FRAMEWORKS) {
    for (const period of COMPLIANCE_PERIODS) {
      matrix[framework][period] = {
        period,
        complianceType: framework,
        isApplicable: false,
        workflowStatus: 'NOT_STARTED',
        complianceOutcome: 'NOT_APPLICABLE',
      };
    }
  }

  // An applicability record is the only source that can turn a cell on.
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

  // Overlay status only from an assessment that really exists in MongoDB.
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

/** Synthetic IDs are not assessments. Only database-backed assessment IDs resolve. */
export function resolveAssessmentById(_id: string, _facilityName?: string): IAssessment | null {
  return null;
}
