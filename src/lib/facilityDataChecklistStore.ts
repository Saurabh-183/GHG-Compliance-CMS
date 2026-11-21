import type { IFacilityDataChecklist, IFacilityDataChecklistItem } from '@/types';
import { buildDefaultChecklistItems, DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { mergeChecklistItemsWithMaster } from '@/lib/applicableRequirements';
import { connectToDatabase } from '@/lib/db';
import { FacilityDataChecklistModel } from '@/models/FacilityDataChecklist';
import { readChecklistFile, writeChecklistFile } from '@/lib/facilityDataChecklistFiles';

declare global {
  // eslint-disable-next-line no-var
  var __facilityChecklistMemoryStore: Map<string, IFacilityDataChecklist> | undefined;
}

function getMemoryStore() {
  if (!global.__facilityChecklistMemoryStore) {
    global.__facilityChecklistMemoryStore = new Map<string, IFacilityDataChecklist>();
  }
  return global.__facilityChecklistMemoryStore;
}

function storeKey(facilityId: string, period: string) {
  return `${facilityId.toUpperCase()}::${period}`;
}

function cloneChecklist(data: IFacilityDataChecklist): IFacilityDataChecklist {
  return {
    ...data,
    items: data.items.map((i) => ({ ...i })),
  };
}

function serializeDoc(doc: {
  _id?: { toString(): string };
  facilityId: string;
  facilityName?: string;
  period: string;
  items: IFacilityDataChecklistItem[];
  sharedWithClient: boolean;
  sharedAt?: Date;
  sharedByName?: string;
  lastUpdatedByName?: string;
  consultantNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): IFacilityDataChecklist {
  return {
    _id: doc._id?.toString() || `chk_${doc.facilityId}_${doc.period}`,
    facilityId: doc.facilityId.toUpperCase(),
    facilityName: doc.facilityName,
    period: doc.period,
    items: doc.items,
    sharedWithClient: doc.sharedWithClient ?? false,
    sharedAt: doc.sharedAt ? new Date(doc.sharedAt).toISOString() : undefined,
    sharedByName: doc.sharedByName,
    lastUpdatedByName: doc.lastUpdatedByName,
    consultantNotes: doc.consultantNotes || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function defaultChecklist(
  facilityId: string,
  facilityName?: string,
  period = DEFAULT_CHECKLIST_PERIOD
): IFacilityDataChecklist {
  const now = new Date().toISOString();
  return {
    _id: `chk_${facilityId}_${period}`,
    facilityId: facilityId.toUpperCase(),
    facilityName,
    period,
    items: buildDefaultChecklistItems(),
    sharedWithClient: false,
    consultantNotes: '',
    createdAt: now,
    updatedAt: now,
  };
}

function pickNewer(a: IFacilityDataChecklist, b: IFacilityDataChecklist): IFacilityDataChecklist {
  const ta = Date.parse(a.updatedAt || a.createdAt);
  const tb = Date.parse(b.updatedAt || b.createdAt);
  if (Number.isNaN(ta) && Number.isNaN(tb)) return b;
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return tb >= ta ? b : a;
}

async function loadFromMongo(fid: string, period: string): Promise<IFacilityDataChecklist | null> {
  try {
    await connectToDatabase();
    const doc = await FacilityDataChecklistModel.findOne({ facilityId: fid, period }).lean();
    if (!doc) return null;
    return serializeDoc(doc as Parameters<typeof serializeDoc>[0]);
  } catch {
    return null;
  }
}

async function persistAll(key: string, checklist: IFacilityDataChecklist): Promise<IFacilityDataChecklist> {
  const memoryStore = getMemoryStore();
  const snapshot = cloneChecklist(checklist);
  memoryStore.set(key, snapshot);
  await writeChecklistFile(key, snapshot);

  try {
    await connectToDatabase();
    await FacilityDataChecklistModel.findOneAndUpdate(
      { facilityId: snapshot.facilityId, period: snapshot.period },
      {
        $set: {
          facilityId: snapshot.facilityId,
          period: snapshot.period,
          facilityName: snapshot.facilityName,
          items: snapshot.items,
          consultantNotes: snapshot.consultantNotes,
          sharedWithClient: snapshot.sharedWithClient,
          sharedAt: snapshot.sharedAt ? new Date(snapshot.sharedAt) : undefined,
          sharedByName: snapshot.sharedByName,
          lastUpdatedByName: snapshot.lastUpdatedByName,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    console.warn('Mongo checklist sync skipped (local file store used):', err);
  }

  return snapshot;
}

export async function getFacilityDataChecklist(
  facilityId: string,
  period = DEFAULT_CHECKLIST_PERIOD,
  facilityName?: string
): Promise<IFacilityDataChecklist> {
  const fid = facilityId.toUpperCase();
  const key = storeKey(fid, period);
  const memoryStore = getMemoryStore();

  let checklist: IFacilityDataChecklist | null = null;

  checklist = await readChecklistFile(key);
  const cached = memoryStore.get(key);
  if (cached) {
    checklist = checklist ? pickNewer(checklist, cached) : cached;
  }

  const fromMongo = await loadFromMongo(fid, period);
  if (fromMongo) {
    checklist = checklist ? pickNewer(checklist, fromMongo) : fromMongo;
  }

  if (!checklist) {
    checklist = defaultChecklist(fid, facilityName, period);
  } else if (facilityName && !checklist.facilityName) {
    checklist = { ...checklist, facilityName };
  }

  checklist = {
    ...checklist,
    items: mergeChecklistItemsWithMaster(checklist.items),
  };

  memoryStore.set(key, cloneChecklist(checklist));
  return cloneChecklist(checklist);
}

export async function saveFacilityDataChecklist(
  facilityId: string,
  period: string,
  patch: Partial<Pick<IFacilityDataChecklist, 'items' | 'consultantNotes' | 'facilityName'>> & {
    lastUpdatedByName?: string;
    sharedWithClient?: boolean;
    sharedByName?: string;
  }
): Promise<IFacilityDataChecklist> {
  const fid = facilityId.toUpperCase();
  const key = storeKey(fid, period);
  const now = new Date().toISOString();

  const existing = await getFacilityDataChecklist(fid, period, patch.facilityName);

  const updated: IFacilityDataChecklist = {
    ...existing,
    facilityId: fid,
    period,
    facilityName: patch.facilityName || existing.facilityName,
    consultantNotes:
      patch.consultantNotes !== undefined ? patch.consultantNotes : existing.consultantNotes,
    lastUpdatedByName: patch.lastUpdatedByName || existing.lastUpdatedByName,
    sharedWithClient:
      patch.sharedWithClient !== undefined ? patch.sharedWithClient : existing.sharedWithClient,
    sharedByName: patch.sharedByName || existing.sharedByName,
    sharedAt:
      patch.sharedWithClient !== undefined && patch.sharedWithClient
        ? now
        : existing.sharedAt,
    updatedAt: now,
    items: patch.items ? patch.items.map((i) => ({ ...i })) : existing.items.map((i) => ({ ...i })),
  };

  return persistAll(key, updated);
}

export function checklistSummary(items: IFacilityDataChecklistItem[]) {
  const received = items.filter((i) => i.status === 'RECEIVED').length;
  const due = items.filter((i) => i.status === 'DUE').length;
  const na = items.filter((i) => i.status === 'NOT_APPLICABLE' || i.status === 'NOT_REQUIRED').length;
  const applicable = items.length - na;
  return { received, due, notApplicable: na, applicable, total: items.length };
}