
/**
 * Synchronize the authoritative Report Current Status list with MongoDB.
 *
 * Default mode is DRY RUN. Pass --apply to provision missing report-list
 * client groups/facilities and synchronize applicability. This script never
 * deletes facilities, client groups, assessments, evidence, metrics,
 * calculation workbooks, submissions, or approvals.
 *
 * Safe rerun: deterministic facilityIds, name aliases, and upserts are used.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const masterPath = path.join(ROOT, 'data/compliance/report-coverage-master.json');
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\(\s*ultratech\s+cement\s*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function slug(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 55);
}

function desiredRows(entry) {
  const rows = [];

  // RCO and RPO are independent source columns.
  for (const period of new Set(entry.rco || [])) {
    rows.push({ complianceType: 'RCO', period });
  }

  for (const period of new Set(entry.rpo || [])) {
    rows.push({ complianceType: 'RPO', period });
  }

  // PAT and CCTS apply only to FY2025-26.
  if (entry.pat) {
    rows.push({
      complianceType: 'PAT',
      period: 'FY2025-26'
    });
  }

  if (entry.ccts) {
    rows.push({
      complianceType: 'CCTS',
      period: 'FY2025-26'
    });
  }

  return rows;
}

function assertMaster() {
  if (!Array.isArray(master.facilities) || !master.facilities.length) {
    throw new Error(
      'Coverage master must contain a non-empty facilities array.'
    );
  }

  const seenIds = new Set();
  const seenNames = new Set();

  for (const entry of master.facilities) {
    if (!entry.name) {
      throw new Error(
        'Coverage master contains a row without a name.'
      );
    }

    const key = normalize(entry.name);

    if (seenNames.has(key)) {
      throw new Error(
        `Duplicate source facility name: ${entry.name}`
      );
    }

    seenNames.add(key);

    if (entry.facilityId) {
      const id = String(entry.facilityId).toUpperCase();

      if (seenIds.has(id)) {
        throw new Error(
          `Duplicate source facilityId: ${id}`
        );
      }

      seenIds.add(id);
    }

    for (const period of [
      ...(entry.rco || []),
      ...(entry.rpo || [])
    ]) {
      if (!['FY2024-25', 'FY2025-26'].includes(period)) {
        throw new Error(
          `Unsupported historical period ${period} for ${entry.name}`
        );
      }
    }
  }
}

async function main() {
  assertMaster();

  if (!process.env.MONGODB_URI && !process.env.MONGO_URL) {
    throw new Error(
      'Set MONGODB_URI (or MONGO_URL) in .env before running this script.'
    );
  }

  await mongoose.connect(
    process.env.MONGODB_URI || process.env.MONGO_URL
  );

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB database connection unavailable.');
  }

  const facilitiesCol = db.collection('facilities');
  const groupsCol = db.collection('clientgroups');
  const applicabilityCol = db.collection(
    'complianceapplicabilities'
  );

  const [facilities, groups] = await Promise.all([
    facilitiesCol.find({}).toArray(),
    groupsCol.find({}).toArray()
  ]);

  const groupByName = new Map(
    groups.map((g) => [normalize(g.name), g])
  );

  const facilityByName = new Map(
    facilities.map((f) => [normalize(f.name), f])
  );

  const facilityById = new Map(
    facilities
      .filter((f) => f.facilityId)
      .map((f) => [
        String(f.facilityId).toUpperCase(),
        f
      ])
  );

  const plannedGroupCreates = new Map();
  const plannedFacilityCreates = [];
  const plannedRenames = [];
  const resolved = [];
  const ambiguous = [];

  // Resolve every report-list row against current records,
  // stable IDs, or explicitly reviewed aliases in the master.
  for (const entry of master.facilities) {
    const candidateNames = [
      entry.name,
      ...(entry.aliases || [])
    ].map(normalize);

    const candidates = new Set();

    for (const name of candidateNames) {
      const match = facilityByName.get(name);

      if (match) {
        candidates.add(match);
      }
    }

    if (entry.facilityId) {
      const byId = facilityById.get(
        String(entry.facilityId).toUpperCase()
      );

      if (byId) {
        candidates.add(byId);
      }
    }

    if (candidates.size > 1) {
      ambiguous.push({
        source: entry.name,
        matches: [...candidates].map(
          (f) => `${f.name} (${f.facilityId})`
        )
      });

      continue;
    }

    let facility = [...candidates][0] || null;

    if (facility) {
      if (facility.name !== entry.name) {
        plannedRenames.push({
          facilityId: facility.facilityId,
          from: facility.name,
          to: entry.name
        });
      }
    } else {
      if (!entry.facilityId || !entry.clientGroupName) {
        ambiguous.push({
          source: entry.name,
          matches: [
            'No existing record and no facilityId/clientGroupName provisioning metadata'
          ]
        });

        continue;
      }

      const groupKey = normalize(entry.clientGroupName);

      let group =
        groupByName.get(groupKey) ||
        plannedGroupCreates.get(groupKey);

      if (!group) {
        group = {
          _id: new mongoose.Types.ObjectId(),
          name: entry.clientGroupName,
          code: slug(entry.clientGroupName),
          industry:
            'Not specified in the supplied report-status master',
          headquarters:
            'Not provided in the supplied report-status master',
          contactPerson: {
            name: 'Not provided',
            email: `not-provided+${slug(entry.clientGroupName).toLowerCase()}@invalid.local`,
            phone: 'Not provided'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        plannedGroupCreates.set(groupKey, group);
      }

      // New facility frameworks are derived from actual source coverage.
      facility = {
        _id: new mongoose.Types.ObjectId(),
        facilityId: String(entry.facilityId).toUpperCase(),
        name: entry.name,
        clientGroupId: group._id,
        location:
          'Not provided in the supplied report-status master',
        category:
          'Not specified in the supplied report-status master',

        enabledFrameworks: [
          ...new Set(
            desiredRows(entry).map(
              (row) => row.complianceType
            )
          )
        ],

        status: 'ACTIVE',

        utilityConnection: {
          providerName: '',
          connectionType: '',
          subDivision: '',
          circle: '',
          consumerAccountNumber: '',
          consumerName: '',
          meterNumber: '',
          contractDemand: ''
        },

        driveConnection: {
          isConnected: false,
          folderUrl: '',
          folderName: '',
          spreadsheetUrl: '',
          syncedMonthsCount: 0
        },

        createdAt: new Date(),
        updatedAt: new Date()
      };

      plannedFacilityCreates.push(facility);

      facilityByName.set(
        normalize(entry.name),
        facility
      );

      facilityById.set(
        String(facility.facilityId).toUpperCase(),
        facility
      );
    }

    resolved.push({
      entry,
      facility,
      desired: desiredRows(entry),
      isNew: plannedFacilityCreates.includes(facility)
    });
  }
// Safety guard: these existing client-directory facilities
// must not be included in this historical report migration.
const protectedFacilityIds = new Set([
  'UNIT_1',
  'UNIT2'
]);

const accidentallyIncluded = master.facilities.filter(
  (entry) =>
    protectedFacilityIds.has(
      String(entry.facilityId || '').toUpperCase()
    )
);

if (accidentallyIncluded.length > 0) {
  throw new Error(
    `Refusing to continue: protected facilities found in report master: ${
      accidentallyIncluded.map((entry) => entry.facilityId).join(', ')
    }`
  );
}
  const matchedIds = new Set(
    resolved.map(
      (x) => String(x.facility.facilityId).toUpperCase()
    )
  );

  const unlistedFacilities = facilities.filter(
    (f) =>
      !matchedIds.has(
        String(f.facilityId || '').toUpperCase()
      )
  );

  const orphanFacilities = facilities.filter(
    (f) =>
      !groups.some(
        (g) => String(g._id) === String(f.clientGroupId)
      )
  );

  const expectedRows = resolved.reduce(
    (n, x) => n + x.desired.length,
    0
  );

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(
    `Authoritative report-list rows: ${master.facilities.length}`
  );
  console.log(
    `Rows resolved to existing records or planned new facilities: ${resolved.length}`
  );
  console.log(
    `New client groups to create: ${plannedGroupCreates.size}`
  );
  console.log(
    `New facilities to create: ${plannedFacilityCreates.length}`
  );
  console.log(
    `Existing facility display names to align to report list: ${plannedRenames.length}`
  );
  console.log(
    `Unlisted existing facilities (will remain completely untouched): ${unlistedFacilities.length}`
  );
  console.log(
    `Orphan existing facilities: ${orphanFacilities.length}`
  );
  console.log(
    `Ambiguous/unresolved source rows: ${ambiguous.length}`
  );
  console.log(
    `Applicable framework/year rows in source: ${expectedRows}`
  );

  for (const framework of ['RCO', 'RPO', 'PAT', 'CCTS']) {
    const count = resolved.reduce(
      (total, item) =>
        total +
        item.desired.filter(
          (row) => row.complianceType === framework
        ).length,
      0
    );

    console.log(`  ${framework}: ${count}`);
  }

  console.log(
    'Rules: RCO and RPO are independent source columns; PAT and CCTS => FY2025-26 only; no FY2026-27 is inferred.'
  );

  if (plannedRenames.length) {
    console.log(
      '\nDISPLAY NAME ALIGNMENTS (stable facilityIds and clientGroupIds are retained):'
    );

    plannedRenames.forEach((x) => {
      console.log(
        ` - ${x.from} -> ${x.to} [${x.facilityId}]`
      );
    });
  }

  if (ambiguous.length) {
    console.log('\nUNRESOLVED / AMBIGUOUS:');

    ambiguous.forEach((x) => {
      console.log(
        ` - ${x.source}: ${x.matches.join('; ')}`
      );
    });
  }

  if (unlistedFacilities.length) {
    console.log(
      '\nEXISTING FACILITIES NOT PRESENT IN REPORT MASTER (not deleted):'
    );

    unlistedFacilities.forEach((x) => {
      console.log(
        ` - ${x.name} [${x.facilityId}]`
      );
    });
  }

  if (orphanFacilities.length) {
    console.log(
      '\nEXISTING FACILITIES WITH INVALID CLIENT GROUP REFERENCES:'
    );

    orphanFacilities.forEach((x) => {
      console.log(
        ` - ${x.name} [${x.facilityId}]`
      );
    });
  }

  if (!APPLY) {
    console.log(
      '\nDry run complete. No database writes were made.'
    );

    return;
  }

  if (ambiguous.length) {
    throw new Error(
      'Refusing to apply: one or more report-list rows are unresolved or ambiguous.'
    );
  }

  if (orphanFacilities.length) {
    throw new Error(
      'Refusing to apply: existing facilities contain invalid clientGroupId references.'
    );
  }

  // Complete collision checks before writing anything.
  for (const facility of plannedFacilityCreates) {
    const collision = await facilitiesCol.findOne({
      $or: [
        { facilityId: facility.facilityId },
        { name: facility.name }
      ]
    });

    if (
      collision &&
      String(collision.facilityId).toUpperCase() !==
        String(facility.facilityId).toUpperCase()
    ) {
      throw new Error(
        `Refusing to apply: facility collision for ${facility.name}; existing facilityId is ${collision.facilityId}.`
      );
    }
  }

  for (const group of plannedGroupCreates.values()) {
    const collision = await groupsCol.findOne({
      code: group.code
    });

    if (
      collision &&
      normalize(collision.name) !== normalize(group.name)
    ) {
      throw new Error(
        `Refusing to apply: client-group code collision for ${group.name}; code ${group.code} belongs to ${collision.name}.`
      );
    }
  }

  // Create a point-in-time backup before the first write.
  // This backup covers matched facilities and their applicability records.
  const backupDir = path.join(
    ROOT,
    'backups',
    'compliance-coverage'
  );

  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const matchedFacilityIds = resolved.map(
    (x) => String(x.facility.facilityId).toUpperCase()
  );

  const beforeApplicability = await applicabilityCol
    .find({
      facilityId: { $in: matchedFacilityIds }
    })
    .toArray();

  const beforeFacilities = await facilitiesCol
    .find({
      facilityId: { $in: matchedFacilityIds }
    })
    .toArray();

  const backupFile = path.join(
    backupDir,
    `before-coverage-sync-${timestamp}.json`
  );

  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        source: master.source,
        facilities: beforeFacilities,
        applicability: beforeApplicability
      },
      null,
      2
    )
  );

  console.log(
    `Pre-migration backup written: ${path.relative(ROOT, backupFile)}`
  );

  // Create only missing parent groups.
  for (const group of plannedGroupCreates.values()) {
    const existing = await groupsCol.findOne({
      name: group.name
    });

    if (!existing) {
      await groupsCol.insertOne(group);
    }
  }

  // Create only missing facilities.
  for (const facility of plannedFacilityCreates) {
    const collision = await facilitiesCol.findOne({
      $or: [
        { facilityId: facility.facilityId },
        { name: facility.name }
      ]
    });

    if (!collision) {
      await facilitiesCol.insertOne(facility);
    } else if (
      String(collision.facilityId).toUpperCase() !==
      String(facility.facilityId).toUpperCase()
    ) {
      throw new Error(
        `Refusing to overwrite facility collision for ${facility.name}: existing facilityId ${collision.facilityId}`
      );
    }
  }

  // Align approved source names while preserving stable IDs and other fields.
  for (const item of plannedRenames) {
    await facilitiesCol.updateOne(
      { facilityId: item.facilityId },
      {
        $set: {
          name: item.to,
          updatedAt: new Date()
        }
      }
    );
  }

  // Re-read provisioned records.
  const currentFacilities = await facilitiesCol
    .find({})
    .toArray();

  const currentById = new Map(
    currentFacilities.map((f) => [
      String(f.facilityId).toUpperCase(),
      f
    ])
  );

  const frameworks = ['RCO', 'RPO', 'PAT', 'CCTS'];

  const matrixPeriods = [
    'FY2024-25',
    'FY2025-26',
    'FY2026-27'
  ];

  let disabledCount = 0;
  let enabledCount = 0;

  // IMPORTANT:
  // Only facilities resolved from the authoritative report master
  // are processed here. Unlisted facilities are not modified.
  for (const item of resolved) {
    const facilityId = String(
      item.facility.facilityId
    ).toUpperCase();

    const live = currentById.get(facilityId);

    if (!live) {
      throw new Error(
        `Facility failed to provision: ${item.entry.name} (${facilityId})`
      );
    }

    // Preserve existing enabled frameworks.
    // Add RPO only when the master explicitly contains RPO coverage.
    const enabled = Array.isArray(live.enabledFrameworks)
      ? [...live.enabledFrameworks]
      : ['RCO', 'PAT', 'CCTS'];

    const hasRpoCoverage = item.desired.some(
      (row) => row.complianceType === 'RPO'
    );

    if (
      hasRpoCoverage &&
      !enabled.includes('RPO')
    ) {
      enabled.push('RPO');
    }

    await facilitiesCol.updateOne(
      { facilityId },
      {
        $set: {
          enabledFrameworks: enabled,
          updatedAt: new Date()
        }
      }
    );

    const desiredKeys = new Set(
      item.desired.map(
        (row) => `${row.complianceType}|${row.period}`
      )
    );

    // Reconcile RCO/RPO/PAT/CCTS for the two source years
    // plus FY2026-27, which is explicitly absent from the master.
    // Other frameworks, other periods, and unlisted facilities
    // remain untouched. No assessments or workflow records are deleted.
    for (const complianceType of frameworks) {
      for (const period of matrixPeriods) {
        const key = `${complianceType}|${period}`;

        const previous = await applicabilityCol.findOne({
          facilityId,
          complianceType,
          period
        });

        if (!desiredKeys.has(key)) {
          if (
            previous &&
            previous.isApplicable !== false
          ) {
            await applicabilityCol.updateOne(
              { _id: previous._id },
              {
                $set: {
                  isApplicable: false,
                  complianceOutcome: 'NOT_APPLICABLE',
                  updatedAt: new Date()
                }
              }
            );

            disabledCount += 1;
          }

          continue;
        }

        const wasApplicable =
          previous?.isApplicable === true;

        const preservedOutcome =
          previous?.complianceOutcome &&
          previous.complianceOutcome !== 'NOT_APPLICABLE'
            ? previous.complianceOutcome
            : 'PENDING_DETERMINATION';

        await applicabilityCol.updateOne(
          {
            facilityId,
            complianceType,
            period
          },
          {
            $set: {
              isApplicable: true,
              workflowStatus:
                previous?.workflowStatus || 'NOT_STARTED',
              complianceOutcome: wasApplicable
                ? previous.complianceOutcome
                : preservedOutcome,
              updatedAt: new Date()
            },

            $setOnInsert: {
              facilityId,
              complianceType,
              period,
              authority: ['RCO', 'RPO'].includes(complianceType)
                ? 'State Electricity Regulatory Commission (SERC)'
                : 'Bureau of Energy Efficiency (BEE)',
              ministry: 'Ministry of Power',
              targetValue: null,
              targetUnit: ['RCO', 'RPO'].includes(complianceType)
                ? '%'
                : 'tCO2e',
              deadline: null,
              notes:
                'Applicability imported from the authoritative Report Current Status master list. RCO and RPO are independent source columns. Existing assessment and workflow records are preserved.',
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        enabledCount += 1;
      }
    }
  }

  // Existing facilities absent from the report master
  // are deliberately left untouched.
  console.log('\nAPPLY COMPLETE');

  console.log(
    `New client groups created: ${plannedGroupCreates.size}`
  );

  console.log(
    `New facilities created: ${plannedFacilityCreates.length}`
  );

  console.log(
    `Existing facility names aligned: ${plannedRenames.length}`
  );

  console.log(
    `Applicability rows set to Not Applicable in the explicit historical scope: ${disabledCount}`
  );

  console.log(
    `Applicable framework/year rows enabled: ${enabledCount}`
  );

  console.log(
    'Unlisted facilities and unrelated framework/year records were left untouched. No existing client groups, facilities, users, assessments, evidence, metrics, workbooks, submissions, or approvals were deleted.'
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  });
