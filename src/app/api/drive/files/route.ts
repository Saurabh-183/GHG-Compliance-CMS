import { NextRequest, NextResponse } from 'next/server';
import {
  getDriveFilesForFacility,
  GOOGLE_DRIVE_FOLDER_URL,
  GOOGLE_DRIVE_FOLDER_ID,
} from '@/lib/gdrive';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  const facilityId = (
    request.nextUrl.searchParams.get('facilityId') || ''
  ).toUpperCase().trim();

  if (!facilityId) {
    return NextResponse.json(
      { success: false, error: 'facilityId query parameter is required.' },
      { status: 400 }
    );
  }

  if (!isAuthorizedForFacility(session, facilityId)) {
    return NextResponse.json(
      { success: false, error: 'You are not authorized to access this facility.' },
      { status: 403 }
    );
  }

  try {
    let facilityName = facilityId.replace(/_/g, ' ');

    try {
      await connectToDatabase();
      const facility = await FacilityModel.findOne({ facilityId }).lean();
      if (facility) {
        if (session.role === 'CLIENT' && facility.clientGroupId.toString() !== session.clientGroupId) return NextResponse.json({ success: false, error: 'You are not authorized to access this facility.' }, { status: 403 });
        facilityName = facility.name;
      } else if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Facility not found.' },
          { status: 404 }
        );
      } else {
        const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
        const found = MOCK_FACILITIES.find(
          (item) => item.facilityId === facilityId
        );
        if (found) facilityName = found.name;
      }
    } catch (databaseError) {
      if (process.env.NODE_ENV === 'production') {
        throw databaseError;
      }

      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const found = MOCK_FACILITIES.find(
        (item) => item.facilityId === facilityId
      );
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
      { success: false, error: 'Failed to retrieve files from Google Drive.' },
      { status: 500 }
    );
  }
}
