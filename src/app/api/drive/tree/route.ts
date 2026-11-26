import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { DriveItemModel } from '@/models/DriveItem';
import { FacilityModel } from '@/models/Facility';
import { readVaultForFacility } from '@/lib/facilityVaultInventory';
import { getFacilityDriveScope } from '@/lib/facilityDriveScope';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  if (session.role !== 'ADMIN' && session.role !== 'CONSULTANT' && session.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const parentId = request.nextUrl.searchParams.get('parentId');
    let facilityId = request.nextUrl.searchParams.get('facilityId')?.trim().toUpperCase();
    const year = request.nextUrl.searchParams.get('financialYear')?.trim();

    if (session.role === 'CLIENT') {
      const authorized = (session.authorizedFacilityIds || []).map((id) => id.toUpperCase());
      if (!facilityId && authorized.length > 0) {
        facilityId = authorized[0];
      }
      if (!facilityId || !authorized.includes(facilityId)) {
        return NextResponse.json({ success: false, error: 'Access denied: not authorized for this facility.' }, { status: 403 });
      }
    } else if (session.role === 'CONSULTANT' && !facilityId) {
      return NextResponse.json({ success: false, error: 'Select an authorized facility.' }, { status: 400 });
    }
    if (facilityId && !isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    const facility = facilityId ? await FacilityModel.findOne({ facilityId }).select('facilityId clientGroupId').lean() : null;
    if (facilityId && !facility) {
      return NextResponse.json({ success: false, error: 'Facility not found.' }, { status: 404 });
    }
    const scope = facilityId ? await getFacilityDriveScope(facilityId) : undefined;
    const query: Record<string, unknown> = { trashed: false };
    let indexedParentAllowed = false;
    if (parentId) {
      const parent = await DriveItemModel.findOne({ driveId: parentId, isFolder: true, trashed: false })
        .select('pathDriveIds').lean();
      indexedParentAllowed = Boolean(parent && (!scope || scope.contains(parent)));
      if (!scope && !indexedParentAllowed) {
        return NextResponse.json({ success: false, error: 'Folder not found.' }, { status: 404 });
      }
      query.parentDriveId = parentId;
    } else if (scope) {
      query.driveId = { $in: scope.folderIds };
    } else {
      query.parentDriveId = { $exists: false };
    }
    if (year) query.financialYear = year;

    const indexedItems = !parentId || indexedParentAllowed
      ? await DriveItemModel.find(query)
        .select('driveId name mimeType parentDriveId webViewLink size modifiedTime isFolder pathNames mappingType clientGroupId facilityId financialYear category mappingConfidence pathDriveIds')
        .sort({ isFolder: -1, name: 1 }).limit(2000).lean()
      : [];
    const indexed = new Map(indexedItems.filter((item) => !scope || scope.contains(item))
      .map((item) => [item.driveId, item]));
    let vaultUnavailable = false;
    const vault = facility && scope
      ? await readVaultForFacility(facility, scope.allowsVaultPath).catch((error) => {
        if (!indexedParentAllowed && !indexed.size) throw error;
        console.warn('Unable to read the facility Drive vault:', error);
        vaultUnavailable = true;
        return [];
      })
      : [];

    if (parentId && !indexedParentAllowed && !vault.some((item) => item.isFolder && item.driveId === parentId)) {
      return NextResponse.json({ success: false, error: 'Folder not found in this facility.' }, { status: 404 });
    }

    const liveItems = vault.filter((item) =>
      (parentId ? item.parentDriveId === parentId : item.pathDriveIds.length === 1) &&
      (!year || (indexed.get(item.driveId)?.financialYear || item.financialYear) === year)
    ).map((item) => {
      const previous = indexed.get(item.driveId);
      indexed.delete(item.driveId);
      return {
        ...previous,
        ...item,
        facilityId,
        financialYear: previous?.financialYear || item.financialYear,
        isIndexed: Boolean(previous),
      };
    });
    const visibleItems = [...[...indexed.values()].map((item) => ({ ...item, isIndexed: true })), ...liveItems]
      .sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name));
    return NextResponse.json({
      success: true,
      data: visibleItems,
      total: visibleItems.length,
      hasMore: indexedItems.length === 2000,
      vaultUnavailable,
    });
  } catch (error) {
    console.error('Drive tree read failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to load Drive contents.' }, { status: 500 });
  }
}
