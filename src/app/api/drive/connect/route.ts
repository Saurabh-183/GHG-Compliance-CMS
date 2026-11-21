import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest } from '@/lib/auth';
import { GOOGLE_DRIVE_FOLDER_URL, resolveComplianceVaultFolderUrl } from '@/lib/gdrive';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const facilityId = (searchParams.get('facilityId') || 'TRIDENT_PAPER').toUpperCase().trim();

    if (!isAuthorizedForFacility(session, facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const facility = await FacilityModel.findOne({ facilityId }).lean();
    if (session.role === 'CLIENT' && facility?.clientGroupId.toString() !== session.clientGroupId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!facility) {
      return NextResponse.json({
        success: true,
        data: {
          isConnected: false,
          folderUrl: GOOGLE_DRIVE_FOLDER_URL,
          folderName: 'Carbon Crunch · Compliance Documents & Evidence Vault',
          spreadsheetUrl: '',
          lastSyncedAt: null,
          syncedMonthsCount: 0,
        },
      });
    }

    const driveConnection = facility.driveConnection || {
      isConnected: false,
      folderUrl: GOOGLE_DRIVE_FOLDER_URL,
      folderName: `${facility.name} Compliance Vault`,
      spreadsheetUrl: '',
      lastSyncedAt: null,
      syncedMonthsCount: 0,
    };

    const normalizedFolderUrl = resolveComplianceVaultFolderUrl(driveConnection.folderUrl);
    const data =
      normalizedFolderUrl === driveConnection.folderUrl
        ? driveConnection
        : { ...driveConnection, folderUrl: normalizedFolderUrl };

    if (normalizedFolderUrl !== driveConnection.folderUrl && facility.driveConnection?.folderUrl) {
      void FacilityModel.updateOne(
        { facilityId },
        { $set: { 'driveConnection.folderUrl': normalizedFolderUrl } }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Google Drive connection lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load Google Drive connection.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    body = await request.json();

    const facilityId = (body.facilityId || 'TRIDENT_PAPER').toUpperCase().trim();
    if (!isAuthorizedForFacility(session, facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const folderUrl = body.folderUrl?.trim();
    const folderName = body.folderName?.trim() || 'Compliance Evidence Drive';
    const spreadsheetUrl = body.spreadsheetUrl?.trim() || '';

    if (!folderUrl) {
      return NextResponse.json({ success: false, error: 'Google Drive folder URL is required' }, { status: 400 });
    }

    const facility = await FacilityModel.findOneAndUpdate(
      { facilityId },
      {
        $set: {
          'driveConnection.isConnected': true,
          'driveConnection.folderUrl': folderUrl,
          'driveConnection.folderName': folderName,
          'driveConnection.spreadsheetUrl': spreadsheetUrl,
          'driveConnection.lastSyncedAt': new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Google Drive repository connected successfully!',
      data: facility.driveConnection,
    });
  } catch (error) {
    console.error('Google Drive connection update failed:', error);
    return NextResponse.json({ error: 'Unable to save Google Drive connection.' }, { status: 500 });
  }
}

