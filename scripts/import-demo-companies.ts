import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectToDatabase } from '../src/lib/db';
import { ClientGroupModel } from '../src/models/ClientGroup';
import { FacilityModel } from '../src/models/Facility';
import { UserModel } from '../src/models/User';

type DirectoryEntry = { name: string; group: string; unitName: string };
const dataDir = path.join(process.cwd(), 'data', 'demo-import');
const directory = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'company-directory.json'), 'utf8')
) as DirectoryEntry[];

const slug = (value: string) =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 55);

async function main() {
  await connectToDatabase();
  const consultant = await UserModel.findOne({ role: 'CONSULTANT' }).sort({ createdAt: 1 });
  const admin = await UserModel.findOne({ role: 'ADMIN' }).sort({ createdAt: 1 });
  const assignedUser = consultant || admin || undefined;

  const groups = new Map<string, any>();
  let groupsUpserted = 0;
  let facilitiesUpserted = 0;

  for (const entry of directory) {
    const groupName = entry.group || entry.name;
    let group = groups.get(groupName);
    if (!group) {
      const code = slug(groupName);
      const existing = await ClientGroupModel.findOneAndUpdate(
        { code },
        {
          $setOnInsert: {
            name: groupName,
            code,
            industry: 'Industrial / Manufacturing',
            headquarters: 'Not provided',
            contactPerson: {
              name: 'Not provided',
              email: 'not-provided@example.invalid',
              phone: 'Not provided',
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      group = existing;
      groups.set(groupName, group);
      groupsUpserted++;
    }

    // Existing Trident facilities and their demo records are left untouched.
    const facilityId = slug(entry.name);
    const update: Record<string, unknown> = {
      name: entry.unitName,
      clientGroupId: group._id,
      location: 'Not provided in company directory',
      category: 'Industrial facility — demo directory entry',
      status: 'ACTIVE',
    };
    if (assignedUser) {
      update.assignedConsultantId = assignedUser._id;
      update.assignedReviewerId = assignedUser._id;
    }

    await FacilityModel.findOneAndUpdate(
      { facilityId },
      { $setOnInsert: { facilityId, ...update } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    facilitiesUpserted++;
  }

  console.log(JSON.stringify({
    success: true,
    directoryEntries: directory.length,
    groupsCreatedOrFound: groupsUpserted,
    facilityEntriesProcessed: facilitiesUpserted,
    note: 'Idempotent import: existing facility records are not overwritten. No collections are cleared.',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Demo company import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
