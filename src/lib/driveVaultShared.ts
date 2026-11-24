import { GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_FOLDER_URL, rewriteLegacyVaultUrlsInText } from '@/lib/gdrive';

export type DriveLinkMappingStatus = 'PENDING' | 'MAPPED' | 'VERIFIED' | 'REJECTED';

export type VaultDocumentCategory =
  | 'Client_Consumption_Sheets'
  | 'DISCOM_Utility_Bills'
  | 'Renewables'
  | 'Fuel_Certificates'
  | 'Production_Records'
  | 'Regulatory_Ack'
  | 'Other_Evidence';

export interface ParsedDriveUrl {
  resourceId: string;
  resourceType: 'file' | 'folder' | 'unknown';
  canonicalUrl: string;
}

export interface VaultRequirementContext {
  facilityId: string;
  period: string;
  title: string;
  category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
  linkedCompliances: string[];
}

export interface VaultIngestInput {
  sourceUrl: string;
  description: string;
  submittedBy: string;
  requirement: VaultRequirementContext;
  clientGroupCode?: string;
  clientGroupName?: string;
  facilityName?: string;
}

export interface VaultIngestResult {
  url: string;
  submittedAt: Date;
  submittedBy: string;
  description: string;
  sourceUrl: string;
  vaultUrl: string;
  vaultFolderUrl: string;
  vaultFolderPath: string;
  vaultCategory: VaultDocumentCategory;
  driveFileId?: string;
  driveFolderId?: string;
  /** File ID after copy/shortcut into the compliance vault */
  vaultFileId?: string;
  /** Deepest folder ID created under the vault root for this upload */
  vaultTargetFolderId?: string;
  fileName: string;
  mappingStatus: DriveLinkMappingStatus;
  ingestionMode: 'VAULT_INDEXED' | 'DRIVE_API_COPIED' | 'LOCAL_VAULT_DEV';
}

export type VaultIngestOverrides = Partial<
  Pick<
    VaultIngestResult,
    | 'url'
    | 'vaultUrl'
    | 'vaultFolderUrl'
    | 'vaultFileId'
    | 'vaultTargetFolderId'
    | 'ingestionMode'
  >
>;

const FILE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
  /\/open\?id=([a-zA-Z0-9_-]+)/,
  /\/uc\?[^#]*\bid=([a-zA-Z0-9_-]+)/,
];

const FOLDER_ID_PATTERNS = [/\/folders\/([a-zA-Z0-9_-]+)/, /\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/];

export function parseGoogleDriveUrl(rawUrl: string): ParsedDriveUrl {
  const trimmed = rawUrl.trim();
  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch?.[1]) {
    return {
      resourceId: sheetMatch[1],
      resourceType: 'file',
      canonicalUrl: `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/edit`,
    };
  }
  for (const pattern of FOLDER_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return {
        resourceId: match[1],
        resourceType: 'folder',
        canonicalUrl: `https://drive.google.com/drive/folders/${match[1]}`,
      };
    }
  }
  for (const pattern of FILE_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return {
        resourceId: match[1],
        resourceType: 'file',
        canonicalUrl: `https://drive.google.com/file/d/${match[1]}/view`,
      };
    }
  }
  return {
    resourceId: '',
    resourceType: 'unknown',
    canonicalUrl: trimmed,
  };
}

export function inferVaultCategory(
  requirement: VaultRequirementContext,
  description: string
): VaultDocumentCategory {
  const haystack = `${requirement.title} ${description}`.toLowerCase();
  if (haystack.includes('discom') || haystack.includes('bill') || haystack.includes('utility')) {
    return 'DISCOM_Utility_Bills';
  }
  if (haystack.includes('renewable') || haystack.includes('solar') || haystack.includes('open access')) {
    return 'Renewables';
  }
  if (haystack.includes('fuel') || haystack.includes('coal') || haystack.includes('gcv')) {
    return 'Fuel_Certificates';
  }
  if (haystack.includes('production') || haystack.includes('sec ')) {
    return 'Production_Records';
  }
  if (haystack.includes('acknowledgement') || haystack.includes('filing') || haystack.includes('pat ')) {
    return 'Regulatory_Ack';
  }
  if (
    haystack.includes('excel') ||
    haystack.includes('consumption') ||
    haystack.includes('log') ||
    requirement.category === 'COMMON_ENERGY'
  ) {
    return 'Client_Consumption_Sheets';
  }
  return 'Other_Evidence';
}

export function buildVaultFolderPath(input: VaultIngestInput, vaultCategory: VaultDocumentCategory): string {
  const group = (input.clientGroupCode || input.clientGroupName || 'CLIENT').replace(/\s+/g, '_').toUpperCase();
  const facility = input.requirement.facilityId.toUpperCase();
  const period = input.requirement.period.replace(/\s+/g, '_');
  return `Client_Submissions/${group}/${facility}/${period}/${vaultCategory}`;
}

function buildDisplayFileName(input: VaultIngestInput, parsed: ParsedDriveUrl): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = input.requirement.title
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const ext = parsed.resourceType === 'folder' ? 'folder' : 'document';
  return `${stamp}_${slug}_${ext}`;
}

export const COMPLIANCE_VAULT_SHARED_URL =
  process.env.NEXT_PUBLIC_GDRIVE_SHARED_VIEW_URL ||
  'https://drive.google.com/drive/shared-with-me';

export function buildVaultIngestResult(
  input: VaultIngestInput,
  overrides?: VaultIngestOverrides
): VaultIngestResult {
  const parsed = parseGoogleDriveUrl(input.sourceUrl);
  const vaultCategory = inferVaultCategory(input.requirement, input.description);
  const vaultFolderPath = buildVaultFolderPath(input, vaultCategory);
  const fileName = buildDisplayFileName(input, parsed);
  const rawFolderUrl =
    overrides?.vaultFolderUrl ??
    (overrides?.vaultTargetFolderId
      ? `https://drive.google.com/drive/folders/${overrides.vaultTargetFolderId}`
      : `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`);
  const vaultFolderUrl = rewriteLegacyVaultUrlsInText(rawFolderUrl);
  const rawVaultUrl = overrides?.vaultUrl ?? parsed.canonicalUrl ?? input.sourceUrl.trim();
  const vaultUrl = rewriteLegacyVaultUrlsInText(rawVaultUrl);
  const primaryUrl = rewriteLegacyVaultUrlsInText(overrides?.url ?? vaultUrl);

  return {
    url: primaryUrl,
    submittedAt: new Date(),
    submittedBy: input.submittedBy,
    description: input.description,
    sourceUrl: parsed.canonicalUrl || input.sourceUrl.trim(),
    vaultUrl,
    vaultFolderUrl,
    vaultFolderPath,
    vaultCategory,
    driveFileId: parsed.resourceType === 'file' ? parsed.resourceId : undefined,
    driveFolderId: parsed.resourceType === 'folder' ? parsed.resourceId : undefined,
    vaultFileId: overrides?.vaultFileId,
    vaultTargetFolderId: overrides?.vaultTargetFolderId,
    fileName,
    mappingStatus: 'PENDING',
    ingestionMode: overrides?.ingestionMode ?? 'VAULT_INDEXED',
  };
}

export function isEmbeddableDriveUrl(url: string): boolean {
  return /drive\.google\.com\/(file|drive)\//.test(url);
}

export function getDrivePreviewEmbedUrl(url: string): string | null {
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview?rm=minimal`;
  }
  const parsed = parseGoogleDriveUrl(url);
  if (parsed.resourceType === 'file' && parsed.resourceId) {
    return `https://drive.google.com/file/d/${parsed.resourceId}/preview`;
  }
  return null;
}

export { GOOGLE_DRIVE_FOLDER_URL };