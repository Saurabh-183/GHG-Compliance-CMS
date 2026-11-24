import type { IRequestDocumentSpec } from '@/types';

/** Clients submit evidence only via Google Drive links. */
export const DEFAULT_SUBMISSION_FORMAT = 'Google Drive link';

/** Workbooks linked in Drive must be Excel (.xlsx). */
export const DEFAULT_ACCEPTED_FILE_TYPES = ['XLSX'] as const;

export function normalizeDocumentSpecsForDriveXlsx(docs: IRequestDocumentSpec[]): IRequestDocumentSpec[] {
  return docs.map((doc) => ({
    ...doc,
    acceptedFileTypes: [...DEFAULT_ACCEPTED_FILE_TYPES],
    description: doc.description?.trim()
      ? doc.description
      : 'Upload an .xlsx file to Google Drive and share the link (view access for consultant).',
  }));
}