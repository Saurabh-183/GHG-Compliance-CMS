import type { IDataRequirementDocument } from '@/models/DataRequirement';

/** Keep submittedDriveLinks.mappingStatus aligned with consultant request review actions. */
export function syncDriveLinksAfterRequestReview(
  requirement: IDataRequirementDocument,
  action: 'START_REVIEW' | 'REQUEST_CHANGES' | 'ACCEPT' | 'REJECT',
  comment?: string
): void {
  const links = requirement.submittedDriveLinks || [];
  if (!links.length) return;

  const reviewer = requirement.reviewedByName || 'Consultant';
  const now = new Date();

  const latestIndexes =
    requirement.submissionHistory?.[requirement.submissionHistory.length - 1]?.driveLinkIndexes;

  const targetIndexes =
    latestIndexes?.length ? latestIndexes : links.map((_, index) => index);

  if (action === 'ACCEPT') {
    links.forEach((link, index) => {
      if (link.mappingStatus === 'REJECTED') return;
      link.mappingStatus = 'VERIFIED';
      if (!link.mappedAt) link.mappedAt = now;
      if (!link.mappedBy) link.mappedBy = reviewer;
      if (!link.verificationNotes && comment?.trim()) {
        link.verificationNotes = comment.trim();
      }
    });
    requirement.submissionStatus = 'RECEIVED';
    return;
  }

  if (action === 'REQUEST_CHANGES' || action === 'REJECT') {
    for (const index of targetIndexes) {
      const link = links[index];
      if (!link) continue;
      link.mappingStatus = 'REJECTED';
      link.mappedAt = now;
      link.mappedBy = reviewer;
      if (comment?.trim()) {
        link.verificationNotes = comment.trim();
      }
    }
    requirement.submissionStatus =
      action === 'REJECT' ? 'REQUESTED' : requirement.submissionStatus;
  }
}