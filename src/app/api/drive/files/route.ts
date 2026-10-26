import { NextRequest, NextResponse } from 'next/server';
import { getDriveFilesForFacility, GOOGLE_DRIVE_FOLDER_URL, GOOGLE_DRIVE_FOLDER_ID } from '@/lib/gdrive';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = (searchParams.get('facilityId') || 'TRIDENT_PAPER').toUpperCase().trim();

    let facilityName = facilityId.replace(/_/g, ' ');

    try {
      await connectToDatabase();
      const facility = await FacilityModel.findOne({ facilityId }).lean();
      if (facility) {
        facilityName = facility.name;
      }
    } catch {
      // Graceful fallback to mock facilities
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const found = MOCK_FACILITIES.find((f) => f.facilityId === facilityId);
      if (found) facilityName = found.name;
    }

    const files = getDriveFilesForFacility(facilityId, facilityName);

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        facilityName,
        folderId: GOOGLE_DRIVE_FOLDER_ID,
        folderUrl: GOOGLE_DRIVE_FOLDER_URL,
        folderName: 'Carbon Crunch · Compliance Documents & Evidence Vault',
        totalFiles: files.length,
        files,
      },
    });
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve files from Google Drive' },
      { status: 500 }
    );
  }
}

