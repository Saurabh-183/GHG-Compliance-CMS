import 'server-only';
import { DriveItemModel } from '@/models/DriveItem';
import { createDriveReadClient } from '@/lib/driveVaultAuth';

type DriveV3 = import('googleapis').drive_v3.Drive;

const FOLDER_MIME = 'application/vnd.google-apps.folder';
type DriveFile = {
  id?: string | null; name?: string | null; mimeType?: string | null; parents?: string[] | null;
  webViewLink?: string | null; webContentLink?: string | null; size?: string | null;
  shortcutDetails?: { targetId?: string | null; targetMimeType?: string | null; targetResourceKey?: string | null } | null;
  modifiedTime?: string | null; createdTime?: string | null; trashed?: boolean | null;
};

export function extractFinancialYear(value: string): string | undefined {
  const normalized = value.trim();
  const patterns = [
    /\bFY\s*([0-9]{4})\s*[-–/]\s*([0-9]{2,4})\b/i,
    /\b(20[0-9]{2})\s*[-–/]\s*(20[0-9]{2})\b/,
    /\b(20[0-9]{2})\s*[-–/]\s*([0-9]{2})\b/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const start = Number(match[1]);
    const endRaw = match[2];
    const end = endRaw.length === 2 ? Math.floor(start / 100) * 100 + Number(endRaw) : Number(endRaw);
    if (end === start + 1) return `FY${start}-${String(end).slice(-2)}`;
  }
  return undefined;
}

function safeDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function readDriveTree(
  drive: DriveV3,
  rootFolderId: string,
  includePath: (ids: string[]) => boolean = () => true
) {
  if (!includePath([rootFolderId])) return [];

  const rootMeta = await drive.files.get({ fileId: rootFolderId, fields: 'id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,trashed', supportsAllDrives: true });
  const rootFile = rootMeta.data as DriveFile;
  if (rootFile.trashed || rootFile.mimeType !== FOLDER_MIME) throw new Error('Drive root must point to an active Google Drive folder.');
  const nodes: DriveFile[] = [{ ...rootFile, parents: [], __pathNames: [rootFile.name || 'Drive root'], __pathDriveIds: [rootFolderId] } as DriveFile];
  const queue: Array<{ id: string; pathNames: string[]; pathDriveIds: string[] }> = [
    { id: rootFolderId, pathNames: [rootFile.name || 'Drive root'], pathDriveIds: [rootFolderId] },
  ];
  const visited = new Set<string>();
  const maxFolders = Number(process.env.GDRIVE_DISCOVERY_MAX_FOLDERS || 50000);

  while (queue.length) {
    const parent = queue.shift()!;
    if (visited.has(parent.id)) continue;
    visited.add(parent.id);
    if (visited.size > maxFolders) throw new Error(`Drive discovery exceeded configured folder limit (${maxFolders}).`);

    let pageToken: string | undefined;
    do {
      const response = await drive.files.list({
        q: `'${parent.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' in parents and trashed=false`,
        pageSize: 1000,
        pageToken,
        orderBy: 'folder,name',
        fields: 'nextPageToken,files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,createdTime,trashed,shortcutDetails)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        ...(process.env.GDRIVE_SHARED_DRIVE_ID ? { corpora: 'drive' as const, driveId: process.env.GDRIVE_SHARED_DRIVE_ID } : {}),
      });
      const children = (response.data.files || []) as DriveFile[];
      for (const file of children) {
        if (!file.id || !file.name) continue;
        const filePathNames = [...parent.pathNames, file.name];
        const filePathIds = [...parent.pathDriveIds, file.id];
        if (!includePath(filePathIds)) continue;
        nodes.push({ ...file, parents: [parent.id], __pathNames: filePathNames, __pathDriveIds: filePathIds } as DriveFile);
        if (file.mimeType === FOLDER_MIME) {
          queue.push({ id: file.id, pathNames: filePathNames, pathDriveIds: filePathIds });
        }
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  return nodes.map((raw) => {
    const file = raw as DriveFile & { __pathNames?: string[]; __pathDriveIds?: string[] };
    const isFolder = file.mimeType === FOLDER_MIME;
    const inferredYear = [...(file.__pathNames || [])].reverse().map(extractFinancialYear).find(Boolean);
    const target = file.shortcutDetails;
    const targetUrl = target?.targetId
      ? (target.targetMimeType === FOLDER_MIME
        ? `https://drive.google.com/drive/folders/${target.targetId}`
        : `https://drive.google.com/open?id=${target.targetId}`) +
        (target.targetResourceKey ? `${target.targetMimeType === FOLDER_MIME ? '?' : '&'}resourcekey=${encodeURIComponent(target.targetResourceKey)}` : '')
      : undefined;
    return {
      driveId: file.id!,
      name: file.name!,
      mimeType: file.mimeType || 'application/octet-stream',
      parentDriveId: file.parents?.[0],
      webViewLink: targetUrl || file.webViewLink || (isFolder ? `https://drive.google.com/drive/folders/${file.id}` : `https://drive.google.com/file/d/${file.id}/view`),
      webContentLink: file.webContentLink || undefined,
      size: file.size || undefined,
      modifiedTime: safeDate(file.modifiedTime),
      createdTime: safeDate(file.createdTime),
      trashed: Boolean(file.trashed),
      pathNames: file.__pathNames || [],
      pathDriveIds: file.__pathDriveIds || [],
      isFolder,
      ...(inferredYear ? { financialYear: inferredYear, mappingConfidence: 'INFERRED' as const } : {}),
    };
  });

}

/** Recursively indexes only the configured root and its descendants. */
export async function discoverDriveTree(rootFolderId: string) {
  const drive = await createDriveReadClient();
  if (!drive) throw new Error('Google Drive API is not configured. Set service-account or OAuth credentials.');
  const startedAt = new Date();
  const docs = await readDriveTree(drive, rootFolderId);

  // Preserve manual entity mappings when refreshing Drive metadata.
  for (let offset = 0; offset < docs.length; offset += 500) {
    const chunk = docs.slice(offset, offset + 500);
    await DriveItemModel.bulkWrite(chunk.map((doc) => ({
      updateOne: {
        filter: { driveId: doc.driveId },
        update: {
          $set: {
            name: doc.name, mimeType: doc.mimeType, parentDriveId: doc.parentDriveId,
            webViewLink: doc.webViewLink, webContentLink: doc.webContentLink, size: doc.size,
            modifiedTime: doc.modifiedTime, createdTime: doc.createdTime, trashed: doc.trashed,
            pathNames: doc.pathNames, pathDriveIds: doc.pathDriveIds, isFolder: doc.isFolder,
            lastSeenAt: startedAt,
          },
          $setOnInsert: {
            mappingType: 'UNMAPPED',
            mappingConfidence: doc.mappingConfidence || 'NONE',
            ...(doc.financialYear ? { financialYear: doc.financialYear } : {}),
          },
        },
        upsert: true,
      },
    })), { ordered: false });
  }

  return {
    rootFolderId,
    scannedAt: startedAt,
    totalItems: docs.length,
    folders: docs.filter((item) => item.isFolder).length,
    files: docs.filter((item) => !item.isFolder).length,
    financialYearCandidates: [...new Set(docs.map((item) => item.financialYear).filter(Boolean))].sort(),
  };
}
