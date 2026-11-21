import type { IDataRequirement, ISubmittedDriveLink } from '@/types';
import { rewriteLegacyVaultUrlsInText } from '@/lib/gdrive';

export type ClientMonthlyEvidenceRow = {
  /** YYYY-MM for calendar months, or synthetic id for non-monthly rows */
  month: string;
  monthLabel: string;
  status: 'ACCEPTED' | 'UNDER_REVIEW' | 'UPLOADED' | 'MISSING';
  evidenceUrl?: string;
  evidenceLabel?: string;
  requestTitle?: string;
  requestId?: string;
  submittedAt?: string;
  submittedBy?: string;
  linkCount?: number;
};

export function formatBillingMonthLabel(monthKey: string): string {
  const m = monthKey.trim();
  const cal = m.match(/^(\d{4})-(\d{2})$/);
  if (cal) {
    const d = new Date(Number(cal[1]), Number(cal[2]) - 1, 1);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }
  }
  return m;
}

function linkOpenUrl(link: ISubmittedDriveLink): string | undefined {
  const raw = link.vaultUrl || link.url || link.sourceUrl;
  return raw ? rewriteLegacyVaultUrlsInText(raw) : undefined;
}

function linkLabel(link: ISubmittedDriveLink): string {
  return link.fileName?.trim() || link.description?.trim() || 'Client upload';
}

function workflowToRowStatus(workflow?: string): ClientMonthlyEvidenceRow['status'] {
  if (workflow === 'ACCEPTED') return 'ACCEPTED';
  if (['UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED'].includes(workflow || '')) return 'UNDER_REVIEW';
  if (workflow === 'CHANGES_REQUESTED') return 'UPLOADED';
  return 'UPLOADED';
}

type LinkPick = {
  url: string;
  label: string;
  at: number;
  submittedBy?: string;
  requirement: IDataRequirement;
};

function pickLatestLink(links: LinkPick[]): LinkPick | null {
  if (!links.length) return null;
  return links.reduce((best, cur) => (cur.at >= best.at ? cur : best));
}

/**
 * Build portal table rows from live DataRequirement documents only (no mock dataset months).
 */
export function buildClientMonthlyEvidenceRows(requirements: IDataRequirement[]): ClientMonthlyEvidenceRow[] {
  if (!requirements.length) return [];

  const monthKeys = new Set<string>();
  for (const req of requirements) {
    if (req.monthlyFrequency && req.reportingMonths?.length) {
      req.reportingMonths.forEach((m) => monthKeys.add(m.trim()));
    }
    for (const link of req.submittedDriveLinks || []) {
      if (link.mappedMonth?.trim()) monthKeys.add(link.mappedMonth.trim());
    }
  }

  const linksByMonth = new Map<string, LinkPick[]>();
  const nonMonthlyRows: ClientMonthlyEvidenceRow[] = [];

  for (const req of requirements) {
    for (const link of req.submittedDriveLinks || []) {
      const url = linkOpenUrl(link);
      if (!url) continue;

      const at = link.submittedAt ? new Date(link.submittedAt).getTime() : 0;
      const pick: LinkPick = {
        url,
        label: linkLabel(link),
        at,
        submittedBy: link.submittedBy,
        requirement: req,
      };

      const mapped = link.mappedMonth?.trim();
      if (mapped) {
        if (!linksByMonth.has(mapped)) linksByMonth.set(mapped, []);
        linksByMonth.get(mapped)!.push(pick);
        monthKeys.add(mapped);
        continue;
      }

      if (req.monthlyFrequency && req.reportingMonths?.length === 1) {
        const only = req.reportingMonths[0];
        if (!linksByMonth.has(only)) linksByMonth.set(only, []);
        linksByMonth.get(only)!.push(pick);
        monthKeys.add(only);
        continue;
      }

      nonMonthlyRows.push({
        month: `other-${req._id}`,
        monthLabel: req.title,
        status: workflowToRowStatus(req.workflowStatus),
        evidenceUrl: url,
        evidenceLabel: pick.label,
        requestTitle: req.title,
        requestId: req.requestId,
        submittedAt: link.submittedAt,
        submittedBy: link.submittedBy,
        linkCount: 1,
      });
    }
  }

  const monthRows: ClientMonthlyEvidenceRow[] = [...monthKeys].sort().map((month) => {
    const picks = linksByMonth.get(month) || [];
    const best = pickLatestLink(picks);
    const statusSource = picks.map((p) => p.requirement);

    if (!best) {
      return {
        month,
        monthLabel: formatBillingMonthLabel(month),
        status: 'MISSING' as const,
      };
    }

    const status = statusSource.some((r) => r.workflowStatus === 'ACCEPTED')
      ? 'ACCEPTED'
      : statusSource.some((r) =>
          ['UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED'].includes(r.workflowStatus || '')
        )
        ? 'UNDER_REVIEW'
        : workflowToRowStatus(best.requirement.workflowStatus);

    return {
      month,
      monthLabel: formatBillingMonthLabel(month),
      status,
      evidenceUrl: best.url,
      evidenceLabel: best.label,
      requestTitle: best.requirement.title,
      requestId: best.requirement.requestId,
      submittedAt: best.at ? new Date(best.at).toISOString() : undefined,
      submittedBy: best.submittedBy,
      linkCount: picks.length,
    };
  });

  return [...monthRows, ...nonMonthlyRows];
}

export function summarizeEvidenceRows(rows: ClientMonthlyEvidenceRow[]) {
  const monthly = rows.filter((r) => /^\d{4}-\d{2}$/.test(r.month));
  const withFile = monthly.filter((r) => r.evidenceUrl);
  const accepted = monthly.filter((r) => r.status === 'ACCEPTED');
  return {
    totalMonths: monthly.length,
    uploadedMonths: withFile.length,
    acceptedMonths: accepted.length,
    uploadPct: monthly.length ? Math.round((withFile.length / monthly.length) * 100) : 0,
    otherSubmissions: rows.length - monthly.length,
  };
}

/** Flat list of Drive / vault links the client attached to consultant data requests (facility + FY scope). */
export type ClientSubmittedDriveFileCard = {
  id: string;
  url: string;
  name: string;
  category: string;
  month?: string;
  submittedAt?: string;
  submittedBy?: string;
  requestTitle: string;
  requestId?: string;
  workflowStatus?: string;
};

function requirementCategoryLabel(req: IDataRequirement): string {
  const raw =
    req.dataCategory?.trim() ||
    (typeof req.category === 'string' ? req.category : '') ||
  '';
  return raw || 'DATA REQUEST';
}

export function listClientSubmittedDriveFiles(requirements: IDataRequirement[]): ClientSubmittedDriveFileCard[] {
  const cards: ClientSubmittedDriveFileCard[] = [];

  for (const req of requirements) {
    const baseCategory = requirementCategoryLabel(req);
    (req.submittedDriveLinks || []).forEach((link, index) => {
      const url = linkOpenUrl(link);
      if (!url) return;

      cards.push({
        id: `${req._id ?? req.requestId ?? 'req'}-${index}`,
        url,
        name: linkLabel(link),
        category: (link.vaultCategory?.trim() || baseCategory).toUpperCase(),
        month: link.mappedMonth?.trim() || undefined,
        submittedAt: link.submittedAt,
        submittedBy: link.submittedBy,
        requestTitle: req.title,
        requestId: req.requestId,
        workflowStatus: req.workflowStatus,
      });
    });
  }

  cards.sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return tb - ta;
  });

  return cards;
}