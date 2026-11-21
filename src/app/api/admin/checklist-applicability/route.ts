import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { authorizeRole, getSessionFromRequest } from '@/lib/auth';
import { FacilityModel } from '@/models/Facility';
import { getFacilityDataChecklist, saveFacilityDataChecklist } from '@/lib/facilityDataChecklistStore';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { buildApplicableRequirementsList } from '@/lib/applicableRequirements';
import { CHECKLIST_MASTER_VERSION, DATA_REQUIREMENT_MASTER, legacyChecklistStatusToApplicability } from '@/lib/dataRequirementMaster';
import { ensureDefaultMasterVersion } from '@/models/ChecklistMasterVersion';
import type { ChecklistApplicabilityStatus, IFacilityDataChecklist, IFacilityDataChecklistItem } from '@/types';

function checklistsDir() {
  return path.join(process.cwd(), '.data', 'facility-checklists');
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const period = request.nextUrl.searchParams.get('period') || DEFAULT_CHECKLIST_PERIOD;
  await connectToDatabase();
  await ensureDefaultMasterVersion();

  const facilities = await FacilityModel.find({}).select('facilityId name clientGroupId').lean();
  const matrix: Array<{
    facilityId: string;
    facilityName?: string;
    items: ReturnType<typeof buildApplicableRequirementsList>;
  }> = [];

  for (const facility of facilities) {
    const checklist = await getFacilityDataChecklist(facility.facilityId, period, facility.name);
    matrix.push({
      facilityId: facility.facilityId,
      facilityName: facility.name,
      items: buildApplicableRequirementsList(checklist),
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      versionId: CHECKLIST_MASTER_VERSION,
      period,
      columns: DATA_REQUIREMENT_MASTER.map((r) => ({
        itemKey: r.itemKey,
        requirementId: r.requirementId,
        label: r.sourceColumnLabel,
        category: r.category,
      })),
      facilities: matrix,
    },
  });
}

export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    facilityId: string;
    period?: string;
    itemKey: string;
    applicability: ChecklistApplicabilityStatus;
    notes?: string;
    specialInstruction?: string;
  };

  if (!body.facilityId || !body.itemKey || !body.applicability) {
    return NextResponse.json({ error: 'facilityId, itemKey and applicability are required.' }, { status: 400 });
  }

  const period = body.period || DEFAULT_CHECKLIST_PERIOD;
  const facilityId = body.facilityId.toUpperCase();
  const checklist = await getFacilityDataChecklist(facilityId, period);

  const items = checklist.items.map((item) => {
    if (item.itemKey !== body.itemKey) return item;
    const status =
      body.applicability === 'APPLICABLE'
        ? 'DUE'
        : body.applicability === 'NOT_APPLICABLE'
          ? 'NOT_APPLICABLE'
          : body.applicability === 'NOT_REQUIRED'
            ? 'NOT_REQUIRED'
            : 'NEEDS_VERIFICATION';

    return {
      ...item,
      applicability: body.applicability,
      importedApplicability: item.importedApplicability ?? item.applicability,
      status,
      notes: body.notes ?? item.notes,
      specialInstruction: body.specialInstruction ?? item.specialInstruction,
    } satisfies IFacilityDataChecklistItem;
  });

  const updated = await saveFacilityDataChecklist(facilityId, period, {
    items,
    lastUpdatedByName: session?.name,
  });

  return NextResponse.json({ success: true, data: updated });
}

/** Bootstrap applicability from local imported checklist JSON snapshots. */
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { period?: string; source?: 'local-files' };
  const period = body.period || DEFAULT_CHECKLIST_PERIOD;

  const imported: string[] = [];
  try {
    const files = await readdir(checklistsDir());
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      const raw = await readFile(path.join(checklistsDir(), file), 'utf8');
      const parsed = JSON.parse(raw) as IFacilityDataChecklist;
      if (parsed.period !== period) continue;

      const items = parsed.items.map((item) => {
        const applicability = legacyChecklistStatusToApplicability(item.status, item.notes);
        return {
          ...item,
          applicability,
          importedApplicability: applicability,
        };
      });

      await saveFacilityDataChecklist(parsed.facilityId, period, {
        items,
        facilityName: parsed.facilityName,
        lastUpdatedByName: session?.name,
      });
      imported.push(parsed.facilityId);
    }
  } catch (err) {
    console.warn('Checklist import bootstrap:', err);
  }

  await connectToDatabase();
  await ensureDefaultMasterVersion();

  return NextResponse.json({
    success: true,
    message: `Imported applicability snapshots for ${imported.length} facilities`,
    data: { period, versionId: CHECKLIST_MASTER_VERSION, facilityIds: imported },
  });
}