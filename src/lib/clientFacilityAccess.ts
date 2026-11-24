import mongoose from 'mongoose';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';

/**
 * Resolve every active facility belonging to a client company.
 * Older installations may store the clientGroupId in the session as either
 * a Mongo ObjectId or the company's short code (for example, TRIDENT).
 */
export async function getClientFacilityIds(clientGroupId?: string | null): Promise<string[]> {
  if (!clientGroupId) return [];

  let groupRef: string | mongoose.Types.ObjectId = clientGroupId;
  if (!mongoose.Types.ObjectId.isValid(clientGroupId)) {
    const group = await ClientGroupModel.findOne({
      code: clientGroupId.trim().toUpperCase(),
    }).select('_id').lean();
    if (!group?._id) return [];
    groupRef = group._id;
  }

  const facilities = await FacilityModel.find({
    clientGroupId: groupRef,
    status: { $ne: 'INACTIVE' },
  }).select('facilityId').lean();

  const ids: string[] = facilities.map((facility: { facilityId: string }) => facility.facilityId.toUpperCase());
  return Array.from(new Set<string>(ids));
}
