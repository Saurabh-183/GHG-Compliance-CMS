import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { IFacilityDataChecklist } from '@/types';

function checklistsDir() {
  return path.join(process.cwd(), '.data', 'facility-checklists');
}

function filePathForKey(key: string) {
  const safe = key.replace(/::/g, '__').replace(/[^A-Z0-9_-]/gi, '_');
  return path.join(checklistsDir(), `${safe}.json`);
}

export async function readChecklistFile(key: string): Promise<IFacilityDataChecklist | null> {
  try {
    const raw = await readFile(filePathForKey(key), 'utf8');
    return JSON.parse(raw) as IFacilityDataChecklist;
  } catch {
    return null;
  }
}

export async function writeChecklistFile(key: string, checklist: IFacilityDataChecklist): Promise<void> {
  const dir = checklistsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(filePathForKey(key), JSON.stringify(checklist, null, 2), 'utf8');
}