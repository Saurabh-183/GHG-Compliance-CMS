import { NextRequest, NextResponse } from 'next/server';
import {
  getDriveFilesForFacility,
  GOOGLE_DRIVE_FOLDER_URL,
  GOOGLE_DRIVE_FOLDER_ID,
  type IDriveFileMetadata,
} from '@/lib/gdrive';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { DriveItemModel } from '@/models/DriveItem';

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

  const facilityId = (request.nextUrl.searchParams.get('facilityId') || '').toUpperCase().trim();
  if (!facilityId) return NextResponse.json({ success: false, error: 'facilityId query parameter is required.' }, { status: 400 });
  if (!isAuthorizedForFacility(session, facilityId)) return NextResponse.json({ success: false, error: 'You are not authorized to access this facility.' }, { status: 403 });

  try {
    await connectToDatabase();
    const facility = await FacilityModel.findOne({ facilityId }).lean();
    if (!facility) return NextResponse.json({ success: false, error: 'Facility not found.' }, { status: 404 });
    if (session.role === 'CLIENT' && String(facility.clientGroupId) !== session.clientGroupId) {
      return NextResponse.json({ success: false, error: 'You are not authorized to access this facility.' }, { status: 403 });
    }

    const indexedItems = await DriveItemModel.find({ facilityId, isFolder: false, trashed: false })
      .select('driveId name mimeType webViewLink webContentLink size modifiedTime category pathNames')
      .sort({ name: 1 }).lean();
    const mappedFacilityFolder = await DriveItemModel.findOne({ facilityId, mappingType: 'FACILITY', isFolder: true, trashed: false })
      .select('driveId name webViewLink').lean();

    // Keep the former demo/evidence list as a backwards-compatible fallback until this facility is mapped.
    const files: IDriveFileMetadata[] = indexedItems.length
      ? indexedItems.map((item) => {
          const openUrl = item.webViewLink || (item.mimeType === 'application/vnd.google-apps.folder'
            ? `https://drive.google.com/drive/folders/${item.driveId}`
            : `https://drive.google.com/file/d/${item.driveId}/view`);
          return {
            id: item.driveId,
            name: item.name,
            mimeType: item.mimeType,
            category: mapCategory(item.category),
            month: inferMonth(`${(item.pathNames || []).join('/')} ${item.name}`),
            url: openUrl,
            downloadUrl: item.webContentLink || openUrl,
            sizeBytes: item.size ? Number(item.size) : undefined,
            lastModified: item.modifiedTime?.toISOString(),
            financialYear: item.financialYear,
            drivePath: (item.pathNames || []).join(' / '),
          };
        })
      : mappedFacilityFolder ? [] : getDriveFilesForFacility(facilityId, facility.name);

    const folderId = mappedFacilityFolder?.driveId || GOOGLE_DRIVE_FOLDER_ID;
    const folderUrl = mappedFacilityFolder?.webViewLink || (mappedFacilityFolder
      ? `https://drive.google.com/drive/folders/${mappedFacilityFolder.driveId}`
      : GOOGLE_DRIVE_FOLDER_URL);

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        facilityName: facility.name,
        folderId,
        folderUrl,
        folderName: mappedFacilityFolder?.name || `${facility.name} Compliance Documents`,
        totalFiles: files.length,
        files,
        source: indexedItems.length ? 'GOOGLE_DRIVE_INDEX' : 'LEGACY_FALLBACK',
      },
    });
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve files from Google Drive.' }, { status: 500 });
  }
}
