import 'server-only';

import { GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';
import {
  buildVaultIngestResult,
  inferVaultCategory,
  buildVaultFolderPath,
  parseGoogleDriveUrl,
  type VaultIngestInput,
  type VaultIngestResult,
} from '@/lib/driveVaultShared';
import { createDriveWriteClient, isDriveVaultSyncConfigured } from '@/lib/driveVaultAuth';
import { saveLocalVaultUpload } from '@/lib/localVaultUpload';

export { isDriveVaultSyncConfigured };

export class VaultPlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultPlacementError';
  }
}

type DriveV3 = import('googleapis').drive_v3.Drive;

export interface VaultPlacementResult {
  vaultUrl: string;
  vaultFolderUrl: string;
  vaultTargetFolderId: string;
  vaultFileId: string;
}

export async function ingestClientDriveLink(input: VaultIngestInput): Promise<VaultIngestResult> {
  const draft = buildVaultIngestResult(input);
  const synced = await syncToComplianceVault({
    sourceUrl: input.sourceUrl,
    vaultFolderPath: draft.vaultFolderPath,
    fileName: draft.fileName,
  });

  if (synced) {
    return buildVaultIngestResult(input, {
      url: synced.vaultUrl,
      vaultUrl: synced.vaultUrl,
      vaultFolderUrl: synced.vaultFolderUrl,
      vaultTargetFolderId: synced.vaultTargetFolderId,
      vaultFileId: synced.vaultFileId,
      ingestionMode: 'DRIVE_API_COPIED',
    });
  }

  if (isDriveVaultSyncConfigured()) {
    throw new VaultPlacementError(
      'Could not save this document into the compliance vault folder. Ensure the vault Google account can open the client link ' +
        `(or share the file with your vault account). Vault root: ${GOOGLE_DRIVE_FOLDER_URL}`
    );
  }

  return buildVaultIngestResult(input, {
    vaultFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
    vaultTargetFolderId: GOOGLE_DRIVE_FOLDER_ID,
    ingestionMode: 'VAULT_INDEXED',
  });
}

/** Upload bytes from the client portal into the vault folder tree. */
export async function uploadBytesToComplianceVault(args: {
  vaultFolderPath: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  targetFolderId?: string;
}): Promise<VaultPlacementResult> {
  const drive = await createDriveWriteClient();
  if (!drive) {
    const allowLocal =
      process.env.NODE_ENV !== 'production' ||
      process.env.GDRIVE_ENABLE_LOCAL_VAULT_FALLBACK === 'true';
    if (allowLocal && !isDriveVaultSyncConfigured()) {
      return saveLocalVaultUpload(args);
    }
    throw new VaultPlacementError(
      'Automatic vault upload is not configured. Add GDRIVE_SERVICE_ACCOUNT_* to .env and share the vault folder with that account, or paste a Google Drive link instead of using direct upload.'
    );
  }

  const rootFolderId = process.env.GDRIVE_FOLDER_ID || GOOGLE_DRIVE_FOLDER_ID;
  const sharedDriveId = process.env.GDRIVE_SHARED_DRIVE_ID;
  const targetFolderId = args.targetFolderId || await ensureFolderPath(drive, rootFolderId, args.vaultFolderPath, sharedDriveId);
  const targetFolderUrl = `https://drive.google.com/drive/folders/${targetFolderId}`;

  const { Readable } = await import('stream');
  const createRes = await drive.files.create({
    requestBody: {
      name: args.fileName,
      parents: [targetFolderId],
    },
    media: {
      mimeType: args.mimeType || 'application/octet-stream',
      body: Readable.from(args.buffer),
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  const vaultFileId = createRes.data.id;
  if (!vaultFileId) {
    throw new VaultPlacementError('Drive API did not return a file id after upload.');
  }

  return {
    vaultUrl: `https://drive.google.com/file/d/${vaultFileId}/view`,
    vaultFolderUrl: targetFolderUrl,
    vaultTargetFolderId: targetFolderId,
    vaultFileId,
  };
}

export function buildVaultContextFromRequirement(
  requirement: VaultIngestInput['requirement'],
  clientGroupCode?: string,
  clientGroupName?: string,
  facilityName?: string,
  description?: string
): { vaultFolderPath: string; fileName: string; vaultCategory: ReturnType<typeof inferVaultCategory> } {
  const vaultCategory = inferVaultCategory(requirement, description || '');
  const vaultFolderPath = buildVaultFolderPath(
    {
      sourceUrl: '',
      description: description || '',
      submittedBy: '',
      requirement,
      clientGroupCode,
      clientGroupName,
      facilityName,
    },
    vaultCategory
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = requirement.title
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const fileName = `${stamp}_${slug}_upload`;
  return { vaultFolderPath, fileName, vaultCategory };
}

async function syncToComplianceVault(args: {
  sourceUrl: string;
  vaultFolderPath: string;
  fileName: string;
}): Promise<VaultPlacementResult | null> {
  if (!isDriveVaultSyncConfigured()) {
    return null;
  }

  const parsed = parseGoogleDriveUrl(args.sourceUrl);
  if (!parsed.resourceId) {
    return null;
  }

  const drive = await createDriveWriteClient();
  if (!drive) return null;

  const rootFolderId = process.env.GDRIVE_FOLDER_ID || GOOGLE_DRIVE_FOLDER_ID;
  const sharedDriveId = process.env.GDRIVE_SHARED_DRIVE_ID;

  try {
    const targetFolderId = await ensureFolderPath(drive, rootFolderId, args.vaultFolderPath, sharedDriveId);
    const targetFolderUrl = `https://drive.google.com/drive/folders/${targetFolderId}`;

    if (parsed.resourceType === 'folder') {
      const shortcut = await createShortcut(drive, {
        targetId: parsed.resourceId,
        targetMimeType: 'application/vnd.google-apps.folder',
        parentFolderId: targetFolderId,
        name: args.fileName,
      });
      return {
        vaultUrl: targetFolderUrl,
        vaultFolderUrl: targetFolderUrl,
        vaultTargetFolderId: targetFolderId,
        vaultFileId: shortcut,
      };
    }

    const vaultFileId = await copyOrShortcutFile(drive, {
      sourceFileId: parsed.resourceId,
      parentFolderId: targetFolderId,
      fileName: args.fileName,
    });

    return {
      vaultUrl: `https://drive.google.com/file/d/${vaultFileId}/view`,
      vaultFolderUrl: targetFolderUrl,
      vaultTargetFolderId: targetFolderId,
      vaultFileId,
    };
  } catch (err) {
    console.warn('Compliance vault sync failed:', err);
    return null;
  }
}

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function ensureFolderPath(
  drive: DriveV3,
  rootFolderId: string,
  vaultFolderPath: string,
  sharedDriveId?: string
): Promise<string> {
  const segments = vaultFolderPath.split('/').filter(Boolean);
  let parentId = rootFolderId;

  for (const segment of segments) {
    parentId = await findOrCreateFolder(drive, parentId, segment, sharedDriveId);
  }

  return parentId;
}

async function findOrCreateFolder(
  drive: DriveV3,
  parentId: string,
  folderName: string,
  sharedDriveId?: string
): Promise<string> {
  const q = [
    `name='${escapeDriveQuery(folderName)}'`,
    `'${parentId}' in parents`,
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false',
  ].join(' and ');

  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...(sharedDriveId ? { corpora: 'drive' as const, driveId: sharedDriveId } : {}),
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id) {
    return existing.id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!createRes.data.id) {
    throw new Error(`Failed to create vault folder segment: ${folderName}`);
  }

  return createRes.data.id;
}

async function copyOrShortcutFile(
  drive: DriveV3,
  args: { sourceFileId: string; parentFolderId: string; fileName: string }
): Promise<string> {
  try {
    const copyRes = await drive.files.copy({
      fileId: args.sourceFileId,
      requestBody: {
        name: args.fileName,
        parents: [args.parentFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    if (copyRes.data.id) {
      return copyRes.data.id;
    }
  } catch (copyErr) {
    console.warn('Drive copy failed, trying export or shortcut:', copyErr);
  }

  try {
    const meta = await drive.files.get({
      fileId: args.sourceFileId,
      fields: 'mimeType, name',
      supportsAllDrives: true,
    });
    const mime = meta.data.mimeType || '';

    if (mime.startsWith('application/vnd.google-apps.')) {
      const exportMime =
        mime === 'application/vnd.google-apps.spreadsheet'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : mime === 'application/vnd.google-apps.document'
            ? 'application/pdf'
            : 'application/pdf';
      const exportRes = await drive.files.export(
        { fileId: args.sourceFileId, mimeType: exportMime },
        { responseType: 'arraybuffer' }
      );
      const buffer = Buffer.from(exportRes.data as ArrayBuffer);
      const ext =
        exportMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? '.xlsx' : '.pdf';
      const { Readable } = await import('stream');
      const uploadRes = await drive.files.create({
        requestBody: {
          name: `${args.fileName}${ext}`,
          parents: [args.parentFolderId],
        },
        media: { mimeType: exportMime, body: Readable.from(buffer) },
        fields: 'id',
        supportsAllDrives: true,
      });
      if (uploadRes.data.id) return uploadRes.data.id;
    }
  } catch (exportErr) {
    console.warn('Drive export upload failed:', exportErr);
  }

  const meta = await drive.files.get({
    fileId: args.sourceFileId,
    fields: 'mimeType, name',
    supportsAllDrives: true,
  });

  return createShortcut(drive, {
    targetId: args.sourceFileId,
    targetMimeType: meta.data.mimeType || 'application/octet-stream',
    parentFolderId: args.parentFolderId,
    name: args.fileName,
  });
}

async function createShortcut(
  drive: DriveV3,
  args: {
    targetId: string;
    targetMimeType: string;
    parentFolderId: string;
    name: string;
  }
): Promise<string> {
  const createRes = await drive.files.create({
    requestBody: {
      name: args.name,
      mimeType: 'application/vnd.google-apps.shortcut',
      parents: [args.parentFolderId],
      shortcutDetails: {
        targetId: args.targetId,
        targetMimeType: args.targetMimeType,
      },
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!createRes.data.id) {
    throw new Error('Failed to create Drive shortcut in vault');
  }

  return createRes.data.id;
}