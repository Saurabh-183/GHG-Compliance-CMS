import type { IDataRequirementDocument } from '@/models/DataRequirement';

type StoredLink = IDataRequirementDocument['submittedDriveLinks'][number];

/**
 * Append or replace client evidence so resubmits do not duplicate rows in the vault UI.
 * - Monthly requests: one link per reporting month (replace same month).
 * - Otherwise: one active evidence link per requirement (replace on resubmit).
 */
export function upsertClientSubmissionLink(
  requirement: IDataRequirementDocument,
  storedLink: StoredLink,
  reportingMonth?: string
): { linkIndex: number; replaced: boolean } {
  if (!requirement.submittedDriveLinks) {
    requirement.submittedDriveLinks = [];
  }
  const links = requirement.submittedDriveLinks;
  const pendingLink: StoredLink = { ...storedLink, mappingStatus: 'PENDING' };

  if (requirement.monthlyFrequency && reportingMonth) {
    const existingIdx = links.findIndex((l) => l.mappedMonth === reportingMonth);
    if (existingIdx >= 0) {
      links[existingIdx] = { ...pendingLink, mappedMonth: reportingMonth };
      return { linkIndex: existingIdx, replaced: true };
    }
    links.push({ ...pendingLink, mappedMonth: reportingMonth });
    return { linkIndex: links.length - 1, replaced: false };
  }

  const isResubmit = (requirement.submissionVersion || 0) > 0;

  if (isResubmit) {
    requirement.submittedDriveLinks = [pendingLink];
    return { linkIndex: 0, replaced: true };
  }

  if (links.length === 0) {
    links.push(pendingLink);
    return { linkIndex: 0, replaced: false };
  }

  // First submission but a link already exists (partial / legacy)
  links[0] = pendingLink;
  if (links.length > 1) {
    requirement.submittedDriveLinks = [pendingLink];
  }
  return { linkIndex: 0, replaced: true };
}

/** Indexes shown in consultant upload lists (hides superseded duplicate links). */
export function activeSubmissionLinkIndexes(
  req: Pick<IDataRequirementDocument, 'submittedDriveLinks' | 'submissionHistory' | 'monthlyFrequency'>
): number[] {
  const links = req.submittedDriveLinks || [];
  if (!links.length) return [];

  if (req.monthlyFrequency) {
    return links.map((_, index) => index);
  }

  const history = req.submissionHistory;
  if (history?.length) {
    const latest = history[history.length - 1].driveLinkIndexes;
    if (latest?.length) {
      return latest.filter((index) => index >= 0 && index < links.length);
    }
  }

  return [links.length - 1];
}