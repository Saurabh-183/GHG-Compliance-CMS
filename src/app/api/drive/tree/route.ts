import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { DriveItemModel } from '@/models/DriveItem';
import { FacilityModel } from '@/models/Facility';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    await connectToDatabase();
    const parentId = request.nextUrl.searchParams.get('parentId');
    const facilityId = request.nextUrl.searchParams.get('facilityId')?.trim().toUpperCase();
    const year = request.nextUrl.searchParams.get('financialYear')?.trim();

    if (session.role === 'CLIENT') {
      if (!facilityId || !isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ success: false, error: 'A permitted facilityId is required.' }, { status: 403 });
      }
      const facility = await FacilityModel.findOne({ facilityId }).lean();
      if (!facility || String(facility.clientGroupId) !== session.clientGroupId) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    } else if (session.role === 'CONSULTANT' && facilityId && !isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    const query: Record<string, unknown> = { trashed: false };
    if (parentId) {
      const parent = await DriveItemModel.findOne({ driveId: parentId, trashed: false }).select('facilityId clientGroupId').lean();
      if (!parent) return NextResponse.json({ success: false, error: 'Folder not found.' }, { status: 404 });
      if (session.role !== 'ADMIN' && parent.facilityId !== facilityId) return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      query.parentDriveId = parentId;
    } else if (facilityId) {
      query.facilityId = facilityId;
      query.mappingType = 'FACILITY';
    } else query.parentDriveId = { $exists: false };
    if (year) query.financialYear = year;
    if (session.role !== 'ADMIN' && !facilityId) {
      return NextResponse.json({ success: false, error: 'Select an authorized facility.' }, { status: 400 });
    }

    const items = await DriveItemModel.find(query)
      .select('driveId name mimeType parentDriveId webViewLink size modifiedTime isFolder pathNames mappingType clientGroupId facilityId financialYear category mappingConfidence')
      .sort({ isFolder: -1, name: 1 }).limit(2000).lean();

    return NextResponse.json({ success: true, data: items, total: items.length, hasMore: items.length === 2000 });
  } catch (error) {
    console.error('Drive tree read failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to load the Drive index.' }, { status: 500 });
  }
}
