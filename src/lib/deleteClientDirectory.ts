import 'server-only';

import type { ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { CalendarItemModel } from '@/models/CalendarItem';
import { ClarificationModel } from '@/models/Clarification';
import { ClientGroupModel } from '@/models/ClientGroup';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { DataRequirementModel } from '@/models/DataRequirement';
import { DatasetModel } from '@/models/Dataset';
import { DriveItemModel } from '@/models/DriveItem';
import { FacilityModel } from '@/models/Facility';
import { FacilityDataChecklistModel } from '@/models/FacilityDataChecklist';
import { NotificationModel } from '@/models/Notification';
import { RegulatorySubmissionModel } from '@/models/RegulatorySubmission';
import { UserModel } from '@/models/User';

export async function runDirectoryDeletion<T>(remove: (session?: ClientSession) => Promise<T>): Promise<T> {
  const connection = await connectToDatabase();
  try {
    return await connection.transaction((session) => remove(session));
  } catch (error) {
    const mongoError = error as { code?: number; message?: string };
    if (mongoError.code !== 20 || !mongoError.message?.includes('Transaction numbers')) throw error;
    // Standalone MongoDB does not support transactions. Each step can be retried.
    return remove();
  }
}

export async function deleteFacilityRecords(facilityIds: string[], session?: ClientSession) {
  if (facilityIds.length === 0) return;

  const filter = { facilityId: { $in: facilityIds } };
  const collections = [
    AssessmentModel.collection,
    CalendarItemModel.collection,
    ClarificationModel.collection,
    ComplianceApplicabilityModel.collection,
    DataRequirementModel.collection,
    DatasetModel.collection,
    DriveItemModel.collection,
    FacilityDataChecklistModel.collection,
    NotificationModel.collection,
    RegulatorySubmissionModel.collection,
  ];
  for (const collection of collections) {
    await collection.deleteMany(filter, { session });
  }
  await UserModel.updateMany(
    { authorizedFacilityIds: { $in: facilityIds } },
    { $pull: { authorizedFacilityIds: { $in: facilityIds } } },
    { session }
  );
  await FacilityModel.deleteMany(filter, { session });
}

export async function deleteClientCompany(id: string, session?: ClientSession) {
  const group = await ClientGroupModel.findById(id, '_id', { session }).lean();
  if (!group) return false;

  const facilities = await FacilityModel.find({ clientGroupId: group._id }, 'facilityId', { session }).lean();
  await deleteFacilityRecords(facilities.map((facility) => facility.facilityId), session);
  await DriveItemModel.deleteMany({ clientGroupId: String(group._id) }, { session });
  await UserModel.deleteMany({ role: 'CLIENT', clientGroupId: group._id }, { session });
  await UserModel.updateMany({ clientGroupId: group._id }, { $unset: { clientGroupId: 1 } }, { session });
  await UserModel.updateMany({ clientGroupIds: group._id }, { $pull: { clientGroupIds: group._id } }, { session });
  await ClientGroupModel.deleteOne({ _id: group._id }, { session });
  return true;
}
