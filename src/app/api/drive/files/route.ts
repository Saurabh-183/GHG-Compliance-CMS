import { NextRequest, NextResponse } from 'next/server';
import type { IDriveFileMetadata } from '@/lib/gdrive';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { readVaultForFacility } from '@/lib/facilityVaultInventory';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { DriveItemModel } from '@/models/DriveItem';
import { getFacilityDriveScope } from '@/lib/facilityDriveScope';

function mapCategory(category?: string): IDriveFileMetadata['category'] {
  switch (category) {
    case 'Renewables': return 'RENEWABLE_PURCHASE';
    case 'Fuel_Certificates': return 'FUEL_CONSUMPTION';
    case 'Production_Records': return 'PRODUCTION';
    case 'Regulatory_Ack': return 'STATUTORY_FILING';
    case 'Client_Consumption_Sheets':
    case 'DISCOM_Utility_Bills': return 'GRID_ELECTRICITY';
    default: return 'OTHER_EVIDENCE';
  }
}

function inferMonth(value: string): string | undefined {
  const numeric = value.match(/\b(20\d{2})[-_/](0[1-9]|1[0-2])\b/);
  if (numeric) return `${numeric[1]}-${numeric[2]}`;
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const lower = value.toLowerCase();
  const year = lower.match(/20\d{2}/)?.[0];
  if (!year) return undefined;
  const monthIndex = months.findIndex((month) => lower.includes(month));
  return monthIndex >= 0 ? `${year}-${String(monthIndex + 1).padStart(2, '0')}` : undefined;
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  if (session.role !== 'ADMIN' && session.role !== 'CONSULTANT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const facilityId = (request.nextUrl.searchParams.get('facilityId') || '').toUpperCase().trim();
  if (!facilityId) return NextResponse.json({ success: false, error: 'facilityId query parameter is required.' }, { status: 400 });
  if (!isAuthorizedForFacility(session, facilityId)) return NextResponse.json({ success: false, error: 'You are not authorized to access this facility.' }, { status: 403 });

  try {
    await connectToDatabase();
    const facility = await FacilityModel.findOne({ facilityId }).lean();
    if (!facility) return NextResponse.json({ success: false, error: 'Facility not found.' }, { status: 404 });

    const scope = await getFacilityDriveScope(facilityId);
    const indexedItems = await DriveItemModel.find({
      pathDriveIds: { $in: scope.folderIds },
      isFolder: false,
      trashed: false,
    })
      .select('driveId name mimeType webViewLink webContentLink size modifiedTime category pathNames pathDriveIds financialYear')
      .sort({ name: 1 }).lean();

    const byId = new Map(indexedItems.filter(scope.contains).map((item) => [item.driveId, item]));
    const vaultItems = await readVaultForFacility(facility, scope.allowsVaultPath).catch((error) => {
      if (!byId.size) throw error;
      console.warn('Unable to refresh the facility Drive vault:', error);
      return [];
    });
    const liveFiles = vaultItems.filter((item) => !item.isFolder).map((item) => {
      const indexed = byId.get(item.driveId);
      byId.delete(item.driveId);
      const category = item.pathNames.slice(0, -1).findLast((name) => mapCategory(name) !== 'OTHER_EVIDENCE');
      return {
        ...item,
        category: indexed?.category || category,
        financialYear: indexed?.financialYear || item.financialYear,
      };
    });

    const files: IDriveFileMetadata[] = [...byId.values(), ...liveFiles].map((item) => {
      const openUrl = item.webViewLink || `https://drive.google.com/file/d/${item.driveId}/view`;
      return {
        id: item.driveId,
        name: item.name,
        mimeType: item.mimeType,
        category: mapCategory(item.category),
        month: inferMonth((item.pathNames || []).join('/')),
        url: openUrl,
        downloadUrl: item.webContentLink || openUrl,
        sizeBytes: item.size ? Number(item.size) : undefined,
        lastModified: item.modifiedTime?.toISOString(),
        financialYear: item.financialYear,
        drivePath: (item.pathNames || []).join(' / '),
      };
    });
    files.sort((a, b) => a.name.localeCompare(b.name));
    const folder = scope.folders[0] || vaultItems.find((item) => item.pathDriveIds.length === 1);

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        facilityName: facility.name,
        folderId: folder?.driveId,
        folderUrl: folder?.webViewLink || (folder && `https://drive.google.com/drive/folders/${folder.driveId}`),
        folderName: folder?.name || `${facility.name} Compliance Documents`,
        totalFiles: files.length,
        files,
        source: vaultItems.length ? 'GOOGLE_DRIVE_VAULT' : 'GOOGLE_DRIVE_INDEX',
      },
    });
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve files from Google Drive.' }, { status: 500 });
  }
}
