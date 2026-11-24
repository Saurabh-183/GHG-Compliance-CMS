import 'server-only';
import { DriveItemModel } from '@/models/DriveItem';

export async function getFacilityDriveScope(facilityId: string) {
  const mappedFolders = await DriveItemModel.find({
    isFolder: true,
    trashed: false,
    $or: [{ mappingType: 'FACILITY' }, { 'mappingHistory.mappingType': 'FACILITY' }],
  }).select('driveId name webViewLink facilityId mappingHistory').sort({ name: 1 }).lean();

  const facilityByFolder = new Map<string, string>();
  for (const folder of mappedFolders) {
    const mapping = folder.mappingHistory?.findLast((entry) => entry.mappingType === 'FACILITY');
    const owner = mapping?.value || folder.facilityId;
    if (owner) facilityByFolder.set(folder.driveId, owner);
  }

  const folders = mappedFolders.filter((folder) => facilityByFolder.get(folder.driveId) === facilityId);
  function nearestOwner(pathDriveIds: string[]) {
    const nearestFolder = pathDriveIds.findLast((id) => facilityByFolder.has(id));
    return nearestFolder === undefined ? undefined : facilityByFolder.get(nearestFolder);
  }

  return {
    folders,
    folderIds: folders.map((folder) => folder.driveId),
    // A nested facility mapping takes precedence over its parent.
    contains(item: { pathDriveIds: string[] }) {
      return nearestOwner(item.pathDriveIds) === facilityId;
    },
    allowsVaultPath(pathDriveIds: string[]) {
      const owner = nearestOwner(pathDriveIds);
      return owner === undefined || owner === facilityId;
    },
  };
}
