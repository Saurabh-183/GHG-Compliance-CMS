import 'server-only';

import { parseGoogleDriveUrl } from '@/lib/driveVaultShared';

export function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function buildFilePreviewEmbedUrl(fileId: string, mimeType?: string): string {
  if (mimeType?.includes('spreadsheet') || mimeType === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${fileId}/preview?rm=minimal`;
  }
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function buildFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

const SPREADSHEET_MIME_PRIORITY = [
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

type DriveV3 = import('googleapis').drive_v3.Drive;

async function getDriveReadClient(): Promise<DriveV3 | null> {
  const clientEmail = process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    return google.drive({ version: 'v3', auth });
  } catch {
    return null;
  }
}

interface DriveListedFile {
  id: string;
  name?: string;
  mimeType?: string;
}

async function listFilesInFolder(folderId: string): Promise<DriveListedFile[]> {
  const drive = await getDriveReadClient();
  if (!drive) return [];

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,modifiedTime,shortcutDetails)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = res.data.files || [];
  return files
    .map((f) => {
      if (f.mimeType === 'application/vnd.google-apps.shortcut' && f.shortcutDetails?.targetId) {
        return {
          id: f.shortcutDetails.targetId,
          name: f.name || undefined,
          mimeType: f.shortcutDetails.targetMimeType || undefined,
        };
      }
      return { id: f.id!, name: f.name || undefined, mimeType: f.mimeType || undefined };
    })
    .filter((f) => Boolean(f.id));
}

export async function pickPrimarySpreadsheetInFolder(folderId: string): Promise<DriveListedFile | null> {
  const files = await listFilesInFolder(folderId);
  if (files.length === 0) return null;

  for (const mime of SPREADSHEET_MIME_PRIORITY) {
    const hit = files.find((f) => f.mimeType === mime);
    if (hit) return hit;
  }

  const byName = files.find((f) =>
    /\.(xlsx|xls|csv)$/i.test(f.name || '') || (f.name || '').toLowerCase().includes('consumption')
  );
  if (byName) return byName;

  return files[0];
}

export async function fetchCsvFromGoogleSheetUrl(url: string): Promise<string | null> {
  const sheetId = extractGoogleSheetId(url);
  if (!sheetId) return null;

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(exportUrl, {
    headers: { 'User-Agent': 'Carbon-Crunch-Compliance-Preview/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text.includes(',') || text.includes('\t') ? text : null;
}

async function fetchCsvFromNativeSheetFileId(fileId: string): Promise<string | null> {
  const drive = await getDriveReadClient();
  if (!drive) return null;
  try {
    const exportRes = await drive.files.export(
      { fileId, mimeType: 'text/csv' },
      { responseType: 'text' }
    );
    const text = exportRes.data as string;
    return text?.includes(',') ? text : null;
  } catch {
    return null;
  }
}

async function downloadDriveFileBytes(fileId: string): Promise<ArrayBuffer | null> {
  const tryUrls = [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/u/0/uc?id=${fileId}&export=download`,
  ];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 64) return buf;
      }
    } catch {
      /* try next */
    }
  }

  const drive = await getDriveReadClient();
  if (!drive) return null;

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'mimeType,name',
      supportsAllDrives: true,
    });

    const mime = meta.data.mimeType || '';
    if (mime.includes('spreadsheet')) {
      const exportRes = await drive.files.export(
        { fileId, mimeType: 'text/csv' },
        { responseType: 'arraybuffer' }
      );
      return exportRes.data as ArrayBuffer;
    }

    const media = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    return media.data as ArrayBuffer;
  } catch (err) {
    console.warn('Service account drive download failed:', err);
    return null;
  }
}

async function parseXlsxToCsv(bytes: ArrayBuffer): Promise<string | null> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(bytes, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return null;
    return XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]) || null;
  } catch {
    return null;
  }
}

export interface ResolvedDrivePreview {
  csvText: string | null;
  /** Always a file/sheet preview — never a folder listing */
  filePreviewEmbedUrl: string | null;
  openInDriveUrl: string | null;
  resolvedFileId: string | null;
  resolvedFileName: string | null;
  sourceType: 'google_sheet' | 'xlsx' | 'file' | 'folder_resolved' | 'unknown';
  resolveNote?: string;
}

async function resolveFromFileId(fileId: string, fileName?: string, mimeType?: string): Promise<ResolvedDrivePreview> {
  const sheetUrl = extractGoogleSheetId(`https://docs.google.com/spreadsheets/d/${fileId}/edit`);
  const embedUrl = sheetUrl
    ? `https://docs.google.com/spreadsheets/d/${fileId}/preview?rm=minimal`
    : buildFilePreviewEmbedUrl(fileId, mimeType);

  let csvText: string | null = null;

  if (sheetUrl || mimeType?.includes('spreadsheet')) {
    csvText = (await fetchCsvFromGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${fileId}/edit`)) ||
      (await fetchCsvFromNativeSheetFileId(fileId));
  }

  if (!csvText) {
    const bytes = await downloadDriveFileBytes(fileId);
    if (bytes) {
      csvText = await parseXlsxToCsv(bytes);
    }
  }

  return {
    csvText,
    filePreviewEmbedUrl: embedUrl,
    openInDriveUrl: buildFileViewUrl(fileId),
    resolvedFileId: fileId,
    resolvedFileName: fileName || null,
    sourceType: sheetUrl || mimeType?.includes('spreadsheet') ? 'google_sheet' : csvText ? 'xlsx' : 'file',
  };
}

export async function resolveDriveDocumentForPreview(input: {
  documentUrl?: string;
  vaultUrl?: string;
  vaultFileId?: string;
  driveFolderId?: string;
}): Promise<ResolvedDrivePreview> {
  const empty: ResolvedDrivePreview = {
    csvText: null,
    filePreviewEmbedUrl: null,
    openInDriveUrl: null,
    resolvedFileId: null,
    resolvedFileName: null,
    sourceType: 'unknown',
  };

  if (input.vaultFileId) {
    return resolveFromFileId(input.vaultFileId);
  }

  const urlCandidates = [input.documentUrl, input.vaultUrl].filter(
    (u): u is string => Boolean(u && u.trim())
  );

  for (const url of urlCandidates) {
    const sheetId = extractGoogleSheetId(url);
    if (sheetId) {
      const csvText = await fetchCsvFromGoogleSheetUrl(url);
      return {
        csvText,
        filePreviewEmbedUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/preview?rm=minimal`,
        openInDriveUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        resolvedFileId: sheetId,
        resolvedFileName: null,
        sourceType: 'google_sheet',
      };
    }

    const parsed = parseGoogleDriveUrl(url);
    if (parsed.resourceType === 'file' && parsed.resourceId) {
      return resolveFromFileId(parsed.resourceId);
    }

    if (parsed.resourceType === 'folder' && parsed.resourceId) {
      const primary = await pickPrimarySpreadsheetInFolder(parsed.resourceId);
      if (primary?.id) {
        const resolved = await resolveFromFileId(primary.id, primary.name, primary.mimeType);
        return {
          ...resolved,
          sourceType: 'folder_resolved',
          resolveNote: primary.name
            ? `Opened file "${primary.name}" from shared folder.`
            : 'Opened primary spreadsheet from shared folder.',
        };
      }
      return {
        ...empty,
        sourceType: 'unknown',
        resolveNote:
          'This link is a folder. Paste a direct file link, or configure the Drive service account to list files inside the folder.',
      };
    }
  }

  if (input.driveFolderId) {
    const primary = await pickPrimarySpreadsheetInFolder(input.driveFolderId);
    if (primary?.id) {
      return resolveFromFileId(primary.id, primary.name, primary.mimeType);
    }
  }

  return empty;
}

/** @deprecated Use resolveDriveDocumentForPreview */
export async function fetchSpreadsheetCsvFromUrl(documentUrl: string): Promise<{
  csvText: string | null;
  spreadsheetEmbedUrl: string | null;
  fileEmbedUrl: string | null;
  sourceType: 'google_sheet' | 'xlsx' | 'unknown';
}> {
  const resolved = await resolveDriveDocumentForPreview({ documentUrl });
  return {
    csvText: resolved.csvText,
    spreadsheetEmbedUrl: resolved.filePreviewEmbedUrl,
    fileEmbedUrl: resolved.filePreviewEmbedUrl,
    sourceType:
      resolved.sourceType === 'google_sheet'
        ? 'google_sheet'
        : resolved.sourceType === 'xlsx'
          ? 'xlsx'
          : 'unknown',
  };
}