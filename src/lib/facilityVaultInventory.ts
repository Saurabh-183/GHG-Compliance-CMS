import 'server-only';

import { GOOGLE_DRIVE_FOLDER_ID } from '@/lib/gdrive';
import { readDriveTree } from '@/lib/driveInventory';
import { createDriveReadClient } from '@/lib/driveVaultAuth';
import { ClientGroupModel } from '@/models/ClientGroup';

export async function readVaultForFacility(
  facility: { facilityId: string; clientGroupId?: unknown },
  includePath: (ids: string[]) => boolean
) {
  const group = facility.clientGroupId
    ? await ClientGroupModel.findById(facility.clientGroupId).select('code name').lean()
    : null;
  return readFacilityVault(
    facility.facilityId,
    [group?.code, group?.name, !group ? 'CLIENT' : undefined],
    includePath
  );
}

export async function readFacilityVault(
  facilityId: string,
  groupNames: Array<string | undefined>,
  includePath: (ids: string[]) => boolean
) {
  const client = await createDriveReadClient();
  if (!client) return [];
  const drive = client;

  async function findFolders(parentId: string, name: string) {
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const { data } = await drive.files.list({
        q: `'${escape(parentId)}' in parents and name='${escape(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'nextPageToken,files(id)',
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const folder of data.files || []) {
        if (folder.id) ids.push(folder.id);
      }
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);
    return ids;
  }

  const rootId = process.env.GDRIVE_FOLDER_ID || GOOGLE_DRIVE_FOLDER_ID;
  const submissions = await findFolders(rootId, 'Client_Submissions');
  const groupKeys = new Set(groupNames.filter((name): name is string => Boolean(name))
    .map((name) => name.replace(/\s+/g, '_').toUpperCase()));
  const groupIds = (await Promise.all(submissions.flatMap((id) =>
    [...groupKeys].map((key) => findFolders(id, key))
  ))).flat();
  const facilityFolders = (await Promise.all(groupIds.map((id) => findFolders(id, facilityId)))).flat();

  return (await Promise.all(facilityFolders.map((id) => readDriveTree(drive, id, includePath)))).flat();
}
