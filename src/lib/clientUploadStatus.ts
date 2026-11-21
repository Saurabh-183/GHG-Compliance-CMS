export type EffectiveMappingStatus = 'PENDING' | 'MAPPED' | 'VERIFIED' | 'REJECTED';

export const MAPPING_STATUS_LABELS: Record<EffectiveMappingStatus, string> = {
  PENDING: 'Awaiting map',
  MAPPED: 'Mapped to record',
  VERIFIED: 'Verified',
  REJECTED: 'Returned',
};

/** Align per-file vault mapping with request workflow so the uploads table reads as one flow. */
export function resolveEffectiveMappingStatus(input: {
  linkMappingStatus?: string | null;
  workflowStatus?: string | null;
  verificationStatus?: string | null;
}): EffectiveMappingStatus {
  const raw = String(input.linkMappingStatus || 'PENDING').toUpperCase();
  const wf = String(input.workflowStatus || '');
  const ver = String(input.verificationStatus || '');

  const link: EffectiveMappingStatus =
    raw === 'MAPPED' || raw === 'VERIFIED' || raw === 'REJECTED' ? raw : 'PENDING';

  if (['ACCEPTED', 'CLOSED'].includes(wf) || ver === 'APPROVED') {
    return link === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
  }

  if (['CHANGES_REQUESTED', 'REJECTED'].includes(wf) || ['CLARIFICATION_REQUIRED', 'REJECTED'].includes(ver)) {
    if (link === 'REJECTED') return 'REJECTED';
    if (link === 'VERIFIED' || link === 'MAPPED') return 'REJECTED';
    return 'PENDING';
  }

  return link;
}

export function resolveClientUploadWorkflowDisplay(input: {
  workflowStatus?: string | null;
  verificationStatus?: string | null;
  submissionStatus?: string | null;
}): string {
  if (input.workflowStatus?.trim()) return input.workflowStatus.trim();
  const ver = input.verificationStatus;
  if (ver === 'APPROVED') return 'ACCEPTED';
  if (ver === 'CLARIFICATION_REQUIRED') return 'CHANGES_REQUESTED';
  if (ver === 'REJECTED') return 'REJECTED';
  if (ver === 'UNDER_REVIEW' || ver === 'AWAITING_APPROVAL') return 'UNDER_REVIEW';
  if (input.submissionStatus === 'RECEIVED') return 'ACCEPTED';
  if (input.submissionStatus === 'PARTIALLY_RECEIVED') return 'PARTIALLY_SUBMITTED';
  if (input.submissionStatus === 'REQUESTED') return 'SUBMITTED';
  return 'UNDER_REVIEW';
}

const GENERIC_CLIENT_FILE_DESCRIPTIONS = new Set([
  'Supporting documentation via Client Portal',
  'Client submission via portal',
  'Supporting documentation',
]);

/** URL the client pasted in the portal (not the consultant vault copy). */
export function resolveClientEvidenceUrl(link: {
  sourceUrl?: string;
  url: string;
  vaultUrl?: string;
}): string {
  const source = link.sourceUrl?.trim();
  if (source) return source;
  const raw = link.url?.trim();
  const vault = link.vaultUrl?.trim();
  if (raw && vault && raw !== vault) return raw;
  return raw || '';
}

export function resolveClientEvidenceLabel(link: {
  description?: string;
  requirementTitle?: string;
}): string {
  const desc = link.description?.trim();
  if (desc && !GENERIC_CLIENT_FILE_DESCRIPTIONS.has(desc)) {
    return desc.length > 42 ? `${desc.slice(0, 40)}…` : desc;
  }
  if (link.requirementTitle?.trim()) {
    const t = link.requirementTitle.trim();
    return t.length > 42 ? `${t.slice(0, 40)}…` : t;
  }
  return 'Client Drive file';
}

export function mappingStatusClass(status: EffectiveMappingStatus): string {
  switch (status) {
    case 'VERIFIED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300';
    case 'MAPPED':
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  }
}