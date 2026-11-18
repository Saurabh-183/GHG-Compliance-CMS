import 'server-only';

import { GOOGLE_DRIVE_FOLDER_ID } from '@/lib/gdrive';
import {
  buildVaultIngestResult,
  parseGoogleDriveUrl,
  type VaultIngestInput,
  type VaultIngestResult,
} from '@/lib/driveVaultShared';

type DriveV3 = import('googleapis').drive_v3.Drive;

export function isDriveVaultSyncConfigured(): boolean {
  if (process.env.GDRIVE_ENABLE_API_COPY === 'false') return false;
  return Boolean(
    process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
      process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
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

  return buildVaultIngestResult(input);
}

interface VaultSyncResult {
  vaultUrl: string;
  vaultFolderUrl: string;
  vaultTargetFolderId: string;
  vaultFileId: string;
}

async function syncToComplianceVault(args: {
  sourceUrl: string;
  vaultFolderPath: string;
  fileName: string;
}): Promise<VaultSyncResult | null> {
  if (!isDriveVaultSyncConfigured()) {
    return null;
  }

  const parsed = parseGoogleDriveUrl(args.sourceUrl);
  if (!parsed.resourceId) {
    return null;
  }

  const clientEmail = process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL!;
  const privateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const rootFolderId = process.env.GDRIVE_FOLDER_ID || GOOGLE_DRIVE_FOLDER_ID;
  const sharedDriveId = process.env.GDRIVE_SHARED_DRIVE_ID;

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

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
    corpora: sharedDriveId ? 'drive' : 'allDrives',
    driveId: sharedDriveId,
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
    console.warn('Drive copy failed, trying shortcut:', copyErr);
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