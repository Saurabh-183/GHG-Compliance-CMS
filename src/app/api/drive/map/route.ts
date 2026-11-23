import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { DriveItemModel, DriveMappingType } from '@/models/DriveItem';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';

const TYPES: DriveMappingType[] = ['CLIENT_GROUP', 'FACILITY', 'FINANCIAL_YEAR', 'CATEGORY'];

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) return NextResponse.json({ success: false, error: 'Only administrators can map Drive folders.' }, { status: 403 });
  try {
    await connectToDatabase();
    const body = await request.json();
    const driveId = String(body.driveId || '').trim();
    const mappingType = String(body.mappingType || '') as DriveMappingType;
    if (!driveId || !TYPES.includes(mappingType)) {
      return NextResponse.json({ success: false, error: 'driveId and a valid mappingType are required.' }, { status: 400 });
    }
    const item = await DriveItemModel.findOne({ driveId, isFolder: true, trashed: false });
    if (!item) return NextResponse.json({ success: false, error: 'Drive folder was not found in the discovered index.' }, { status: 404 });

    const inherited: Record<string, unknown> = {};
    if (mappingType === 'CLIENT_GROUP') {
      const groupKey = String(body.clientGroupId || body.clientGroupCode || '').trim();
      const group = mongoose.Types.ObjectId.isValid(groupKey)
        ? await ClientGroupModel.findById(groupKey)
        : await ClientGroupModel.findOne({ $or: [{ code: groupKey.toUpperCase() }, { name: groupKey }] });
      if (!group) return NextResponse.json({ success: false, error: 'Client group not found. Provide its database ID or company code.' }, { status: 404 });
      Object.assign(inherited, { clientGroupId: String(group._id), mappingType: 'CLIENT_GROUP' });
    }
    if (mappingType === 'FACILITY') {
      const facilityId = String(body.facilityId || '').trim().toUpperCase();
      const facility = await FacilityModel.findOne({ facilityId });
      if (!facility) return NextResponse.json({ success: false, error: 'Facility not found.' }, { status: 404 });
      Object.assign(inherited, { facilityId, clientGroupId: String(facility.clientGroupId), mappingType: 'FACILITY' });
    }
    if (mappingType === 'FINANCIAL_YEAR') {
      const financialYear = String(body.financialYear || '').trim();
      if (!/^FY20\d{2}-\d{2}$/.test(financialYear)) return NextResponse.json({ success: false, error: 'Use financial year format FY2025-26.' }, { status: 400 });
      Object.assign(inherited, { financialYear, mappingType: 'FINANCIAL_YEAR' });
    }
    if (mappingType === 'CATEGORY') {
      const category = String(body.category || '').trim();
      if (!category) return NextResponse.json({ success: false, error: 'category is required.' }, { status: 400 });
      Object.assign(inherited, { category, mappingType: 'CATEGORY' });
    }

    const descendants = await DriveItemModel.find({ pathDriveIds: driveId }).select('driveId').lean();
    const ids = [driveId, ...descendants.map((entry) => entry.driveId)];
    const propagation: Record<string, unknown> = {};
    for (const key of ['clientGroupId', 'facilityId', 'financialYear', 'category'] as const) {
      if (Object.prototype.hasOwnProperty.call(inherited, key)) propagation[key] = inherited[key];
    }
    const result = await DriveItemModel.updateMany(
      { driveId: { $in: ids } },
      { $set: { ...propagation, mappingConfidence: 'MANUAL' } }
    );
    const mappingValue = mappingType === 'CLIENT_GROUP'
      ? String(inherited.clientGroupId)
      : mappingType === 'FACILITY'
        ? String(inherited.facilityId)
        : mappingType === 'FINANCIAL_YEAR'
          ? String(inherited.financialYear)
          : String(inherited.category);
    await DriveItemModel.updateOne(
      { driveId },
      {
        $set: { mappingType },
        $push: { mappingHistory: { mappedBy: session!.userId, mappedByName: session!.name || session!.email, mappedAt: new Date(), mappingType, value: mappingValue } },
      }
    );
    return NextResponse.json({ success: true, message: `Folder mapping saved and applied to ${result.modifiedCount} indexed items.`, data: { driveId, mappingType, affectedItems: result.modifiedCount } });
  } catch (error) {
    console.error('Drive folder mapping failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save folder mapping.' }, { status: 500 });
  }
}
