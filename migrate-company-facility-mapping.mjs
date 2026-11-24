
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mappingPath = path.join(
  __dirname,
  'company-facility-mapping.json'
);

if (!fs.existsSync(mappingPath)) {
  throw new Error('company-facility-mapping.json not found.');
}

const mapping = JSON.parse(
  fs.readFileSync(mappingPath, 'utf8')
);

const apply = process.argv.includes('--apply');
const resetPasswords = process.argv.includes('--reset-passwords');

const initialPassword = process.env.CLIENT_INITIAL_PASSWORD || '';

if (apply && initialPassword.length < 12) {
  throw new Error('CLIENT_INITIAL_PASSWORD must be set to at least 12 characters before applying the migration.');
}

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL;

if (!uri) {
  throw new Error(
    'Set MONGODB_URI or MONGO_URL in your environment before running this script.'
  );
}

if (
  !Array.isArray(mapping.groups) ||
  !Array.isArray(mapping.facilities)
) {
  throw new Error(
    'Invalid mapping file. Expected groups and facilities arrays.'
  );
}

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const slug = (value) =>
  String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 55);

function validateMapping() {
  const errors = [];

  const groupNames = new Set();
  const groupIds = new Set();

  for (const group of mapping.groups) {
    const name = normalize(group.name);

    if (!name) {
      errors.push('Company with missing name found.');
      continue;
    }

    if (groupNames.has(name)) {
      errors.push(`Duplicate company name: ${group.name}`);
    }

    groupNames.add(name);

    if (group._id) {
      const id = String(group._id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        errors.push(
          `Invalid MongoDB ObjectId for company: ${group.name}`
        );
      }

      if (groupIds.has(id)) {
        errors.push(
          `Duplicate company ObjectId: ${id}`
        );
      }

      groupIds.add(id);
    }
  }

  const facilityIds = new Set();
  const facilityNames = new Set();

  for (const facility of mapping.facilities) {
    if (!facility.name) {
      errors.push('Facility with missing name found.');
      continue;
    }

    const companyExists = mapping.groups.some(
      (group) =>
        group.name === facility.clientGroupName
    );

    if (!companyExists) {
      errors.push(
        `Company mapping missing for facility: ${facility.name} (${facility.clientGroupName})`
      );
    }

    const facilityId = slug(
      facility.facilityId || facility.name
    );

    if (!facilityId) {
      errors.push(
        `Invalid facility ID for: ${facility.name}`
      );
    }

    if (facilityIds.has(facilityId)) {
      errors.push(
        `Duplicate facility ID in mapping: ${facilityId}`
      );
    }

    facilityIds.add(facilityId);

    const normalizedName = normalize(facility.name);

    if (facilityNames.has(normalizedName)) {
      errors.push(
        `Duplicate facility name in mapping: ${facility.name}`
      );
    }

    facilityNames.add(normalizedName);
  }

  if (errors.length) {
    console.error('\nMAPPING VALIDATION FAILED:\n');

    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });

    throw new Error(
      `${errors.length} mapping validation error(s). Migration stopped.`
    );
  }
}

validateMapping();

console.log('\nMapping validation successful.');

await mongoose.connect(uri);

try {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB database connection unavailable.');
  }

  const groupsCol = db.collection('clientgroups');
  const facilitiesCol = db.collection('facilities');
  const usersCol = db.collection('users');

  const [
    existingGroups,
    existingFacilities,
    existingUsers
  ] = await Promise.all([
    groupsCol.find({}).toArray(),
    facilitiesCol.find({}).toArray(),
    usersCol.find({}).toArray()
  ]);

  const groupByName = new Map(
    existingGroups.map((group) => [
      normalize(group.name),
      group
    ])
  );

  const facilityByName = new Map(
    existingFacilities.map((facility) => [
      normalize(facility.name),
      facility
    ])
  );

  const facilityById = new Map(
    existingFacilities
      .filter((facility) => facility.facilityId)
      .map((facility) => [
        String(facility.facilityId).toUpperCase(),
        facility
      ])
  );

  const resolvedGroups = new Map();
  const groupOps = [];

  let groupsToCreate = 0;

  // 1. Resolve company groups.
  for (const proposed of mapping.groups) {
    const current = groupByName.get(
      normalize(proposed.name)
    );

    const id =
      current?._id ??
      new mongoose.Types.ObjectId(proposed._id);

    resolvedGroups.set(proposed.name, id);

    if (!current) {
      groupsToCreate++;

      groupOps.push({
        insertOne: {
          document: {
            _id: id,
            name: proposed.name,
            code: proposed.code,
            industry: proposed.industry,
            headquarters: proposed.headquarters,
            contactPerson: proposed.contactPerson,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      });
    }
  }

  // 2. Prepare facility mapping.
  const facilityOps = [];

  const missingUnits = [];
  const reassignmentDetails = [];
  const matchedFacilities = [];
  const ambiguousMatches = [];

  let reassignmentCount = 0;
  let newFacilityCount = 0;

  for (const proposed of mapping.facilities) {
    const targetGroupId = resolvedGroups.get(
      proposed.clientGroupName
    );

    if (!targetGroupId) {
      throw new Error(
        `Unable to resolve company: ${proposed.clientGroupName}`
      );
    }

    const proposedFacilityId = slug(
      proposed.facilityId || proposed.name
    );

    const idMatch = facilityById.get(
      proposedFacilityId
    );

    const nameMatch = facilityByName.get(
      normalize(proposed.name)
    );

    // Semikhera legacy fallback.
    const legacyMatch =
      normalize(proposed.name).includes('semikhera')
        ? facilityById.get('SUGAR_SEMIKHERA')
        : undefined;

    const matches = [
      ...new Set(
        [idMatch, nameMatch, legacyMatch].filter(Boolean)
      )
    ];

    if (matches.length > 1) {
      ambiguousMatches.push({
        proposedFacility: proposed.name,
        matchedRecords: matches.map((facility) => ({
          name: facility.name,
          facilityId: facility.facilityId,
          mongoId: facility._id.toString()
        }))
      });

      continue;
    }

    const current = matches[0];

    if (current) {
      const currentGroup = existingGroups.find(
        (group) =>
          String(group._id) ===
          String(current.clientGroupId)
      );

      const currentGroupName =
        currentGroup?.name || 'Unknown';

      const needsReassignment =
        String(current.clientGroupId) !==
        String(targetGroupId);

      if (needsReassignment) {
        reassignmentCount++;

        reassignmentDetails.push({
          facility: proposed.name,
          facilityId: current.facilityId,
          currentCompany: currentGroupName,
          targetCompany: proposed.clientGroupName,
          mongoId: current._id.toString()
        });
      }

      matchedFacilities.push({
        facility: proposed.name,
        existingFacilityId: current.facilityId,
        currentCompany: currentGroupName,
        targetCompany: proposed.clientGroupName,
        reassignmentRequired: needsReassignment
      });

      facilityOps.push({
        updateOne: {
          filter: {
            _id: current._id
          },
          update: {
            $set: {
              name: proposed.name,
              clientGroupId: targetGroupId,
              updatedAt: new Date()
            }
          }
        }
      });
    } else {
      missingUnits.push(proposed.name);
      newFacilityCount++;

      const facilityId = proposedFacilityId;

      facilityOps.push({
        insertOne: {
          document: {
            facilityId,
            name: proposed.name,
            clientGroupId: targetGroupId,
            location:
              proposed.location ||
              'Not provided in source PDF',
            category:
              proposed.category ||
              'Industrial Facility (confirm)',
            status: proposed.status || 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      });
    }
  }

  // 3. Detect existing account email conflicts.
  const proposedAccounts = mapping.groups.map((group) => ({
    company: group.name,
    email: `${normalize(group.name)}@clients.com`,
    clientGroupId: resolvedGroups.get(group.name)
  }));

  const accountConflicts = [];

  for (const account of proposedAccounts) {
    const existingUser = existingUsers.find(
      (user) =>
        String(user.email).toLowerCase() ===
        account.email.toLowerCase()
    );

    if (
      existingUser &&
      existingUser.clientGroupId &&
      String(existingUser.clientGroupId) !==
      String(account.clientGroupId)
    ) {
      accountConflicts.push({
        email: account.email,
        company: account.company,
        existingUserId: existingUser._id.toString(),
        existingClientGroupId:
          String(existingUser.clientGroupId),
        proposedClientGroupId:
          String(account.clientGroupId)
      });
    }
  }

  // 4. Print complete dry-run report.
  const report = {
    mode: apply ? 'APPLY' : 'DRY RUN',

    database: db.databaseName,

    source: mapping.source,

    sourceCompanyCount: mapping.proposedCompanyCount,

    sourceFacilityRows: mapping.facilityRowCount,

    existingCompanies: existingGroups.length,

    existingFacilities: existingFacilities.length,

    existingUsers: existingUsers.length,

    companiesToCreate: groupsToCreate,

    facilitiesMatched: matchedFacilities.length,

    facilitiesToReassign: reassignmentCount,

    reassignmentDetails,

    facilitiesToCreate: newFacilityCount,

    missingFacilityNames: missingUnits,

    ambiguousMatches,

    accountConflicts,

    proposedClientAccounts: proposedAccounts.map(
      ({ company, email }) => ({
        company,
        email
      })
    ),

    notes: [
      'Existing matched facility MongoDB IDs are preserved.',
      'Existing compliance records are not deleted.',
      'Facility ownership changes are listed in reassignmentDetails.',
      'New facility location/category values may be placeholders.',
      'Existing client passwords are preserved unless reset is explicitly requested.'
    ]
  };

  console.log(
    '\nMIGRATION REPORT:\n',
    JSON.stringify(report, null, 2)
  );

  // 5. Stop if there are ambiguous facility matches.
  if (ambiguousMatches.length > 0) {
    throw new Error(
      'Ambiguous facility matches found. Resolve them before provisioning.'
    );
  }

  // 6. Stop if company account email conflicts exist.
  if (accountConflicts.length > 0) {
    throw new Error(
      'Existing user email conflicts found. Resolve them before provisioning.'
    );
  }

  if (!apply) {
    console.log(
      '\nDRY RUN COMPLETED. No database records were modified.'
    );

    console.log(
      'Review reassignmentDetails before running provisioning.'
    );
  } else {
    // 7. Create missing company groups.
    if (groupOps.length > 0) {
      await groupsCol.bulkWrite(groupOps, {
        ordered: false
      });
    }

    // 8. Assign facilities to their companies.
    if (facilityOps.length > 0) {
      await facilitiesCol.bulkWrite(facilityOps, {
        ordered: false
      });
    }

    console.log(
      '\nCompany groups and facility assignments updated.'
    );

    // 9. Generate initial password hash.
    const initialPasswordHash = await bcrypt.hash(
      initialPassword,
      12
    );

    const provisionedAccounts = [];

    // 10. Provision one login per company.
    for (const proposed of mapping.groups) {
      const groupId = resolvedGroups.get(
        proposed.name
      );

      const email =
        `${normalize(proposed.name)}@clients.com`;

      const facilities = await facilitiesCol
        .find(
          {
            clientGroupId: groupId,
            status: { $ne: 'INACTIVE' }
          },
          {
            projection: {
              facilityId: 1
            }
          }
        )
        .toArray();

      const authorizedFacilityIds = facilities
        .map((facility) => facility.facilityId)
        .filter(Boolean);

      if (authorizedFacilityIds.length === 0) {
        throw new Error(
          `No facilities assigned to company ${proposed.name}. Account provisioning stopped.`
        );
      }

      const userUpdate = {
        $set: {
          name: proposed.name,
          email,
          role: 'CLIENT',
          clientGroupId: groupId,
          authorizedFacilityIds,
          designation: 'Company Data Collection User',
          updatedAt: new Date()
        },

        $setOnInsert: {
          passwordHash: initialPasswordHash,
          mustChangePassword: true,
          createdAt: new Date()
        }
      };

      if (resetPasswords) {
        userUpdate.$set.passwordHash =
          initialPasswordHash;
      }

      await usersCol.updateOne(
        {
          email
        },
        userUpdate,
        {
          upsert: true
        }
      );

      provisionedAccounts.push({
        company: proposed.name,
        email,
        facilityCount: authorizedFacilityIds.length,
        facilityIds: authorizedFacilityIds
      });
    }

    // 11. Print account report.
    console.log(
      '\nPROVISIONED COMPANY ACCOUNTS:\n',
      JSON.stringify(provisionedAccounts, null, 2)
    );

    console.log(
      '\nPassword configuration:',
      resetPasswords
        ? 'Existing and new accounts use the configured initial password.'
        : 'Initial password applied only to newly created accounts. Existing passwords preserved.'
    );

    // 12. Remove only unused empty synthetic groups.
    const obsoleteNames = [
      'Independent Paper & Allied Mills',
      'Cooperative & Allied Sugar Mills',
      'Engineering, Metals & Allied'
    ];

    const removedEmptyGroups = [];

    for (const obsoleteName of obsoleteNames) {
      const oldGroup = await groupsCol.findOne({
        name: obsoleteName
      });

      if (!oldGroup) continue;

      const [facilityRefs, userRefs] =
        await Promise.all([
          facilitiesCol.countDocuments({
            clientGroupId: oldGroup._id
          }),

          usersCol.countDocuments({
            clientGroupId: oldGroup._id
          })
        ]);

      if (
        facilityRefs === 0 &&
        userRefs === 0
      ) {
        await groupsCol.deleteOne({
          _id: oldGroup._id
        });

        removedEmptyGroups.push(obsoleteName);
      }
    }

    // 13. Final verification.
    const [
      finalCompanyCount,
      finalFacilityCount,
      finalClientCount
    ] = await Promise.all([
      groupsCol.countDocuments(),

      facilitiesCol.countDocuments(),

      usersCol.countDocuments({
        role: 'CLIENT'
      })
    ]);

    console.log(
      '\nMIGRATION COMPLETED SUCCESSFULLY.'
    );

    console.log(
      '\nRemoved empty unused groups:',
      JSON.stringify(removedEmptyGroups, null, 2)
    );

    console.log(
      '\nFINAL DATABASE COUNTS:\n',
      JSON.stringify(
        {
          companies: finalCompanyCount,
          facilities: finalFacilityCount,
          clientAccounts: finalClientCount,
          accountsProvisioned: provisionedAccounts.length
        },
        null,
        2
      )
    );
  }
} finally {
  await mongoose.disconnect();
}
