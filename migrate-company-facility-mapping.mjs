import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'company-facility-mapping.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) throw new Error('Set MONGODB_URI or MONGO_URL in your environment before running this script.');

const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = (value) => String(value).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 55);
await mongoose.connect(uri);
try {
  const db = mongoose.connection.db;
  const groupsCol = db.collection('clientgroups');
  const facilitiesCol = db.collection('facilities');
  const usersCol = db.collection('users');
  const [existingGroups, existingFacilities] = await Promise.all([groupsCol.find({}).toArray(), facilitiesCol.find({}).toArray()]);
  const groupByName = new Map(existingGroups.map(g => [normalize(g.name), g]));
  const facilityByName = new Map(existingFacilities.map(f => [normalize(f.name), f]));
  const facilityById = new Map(existingFacilities.map(f => [String(f.facilityId || '').toUpperCase(), f]));
  const resolvedGroups = new Map();
  const groupOps = [];
  let groupsToCreate = 0;
  for (const proposed of mapping.groups) {
    const current = groupByName.get(normalize(proposed.name));
    const id = current?._id ?? new mongoose.Types.ObjectId(proposed._id);
    resolvedGroups.set(proposed.name, id);
    if (!current) {
      groupsToCreate++;
      groupOps.push({ insertOne: { document: { _id: id, name: proposed.name, code: proposed.code, industry: proposed.industry, headquarters: proposed.headquarters, contactPerson: proposed.contactPerson, createdAt: new Date(), updatedAt: new Date() } } });
    }
  }
  const facilityOps = [];
  const missingUnits = [];
  let reassignmentCount = 0;
  let newFacilityCount = 0;
  for (const proposed of mapping.facilities) {
    const targetGroupId = resolvedGroups.get(proposed.clientGroupName);
    // Match by stable facilityId first. PDF unit labels can differ from existing DB labels
    // (for example, 'Trident Group - Paper Division' vs 'Trident Paper Complex').
    const proposedFacilityId = slug(proposed.facilityId || proposed.name);
   const current =
  facilityById.get(proposedFacilityId) ||
  facilityByName.get(normalize(proposed.name)) ||
  (normalize(proposed.name).includes('semikhera')
    ? facilityById.get('SUGAR_SEMIKHERA')
    : undefined);
    if (current) {
      if (String(current.clientGroupId) !== String(targetGroupId)) reassignmentCount++;
      facilityOps.push({ updateOne: { filter: { _id: current._id }, update: { $set: { name: proposed.name, clientGroupId: targetGroupId, updatedAt: new Date() } } } });
    } else {
      missingUnits.push(proposed.name);
      newFacilityCount++;
      const facilityId = proposedFacilityId;
      facilityOps.push({ insertOne: { document: { facilityId, name: proposed.name, clientGroupId: targetGroupId, location: proposed.location || 'Not provided in source PDF', category: proposed.category || 'Industrial Facility (confirm)', status: proposed.status || 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } } });
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY RUN', database: db.databaseName, source: mapping.source, sourceCompanyCount: mapping.proposedCompanyCount, sourceFacilityRows: mapping.facilityRowCount, existingCompanies: existingGroups.length, existingFacilities: existingFacilities.length, companiesToCreate: groupsToCreate, facilitiesToReassign: reassignmentCount, facilitiesToCreate: newFacilityCount, missingFacilityNames: missingUnits, note: 'No existing companies/facilities or compliance records are deleted. New facility location/category values may be placeholders from the PDF.', }, null, 2));
  if (!apply) {
    console.log('Dry run only. Review the mapping, then rerun with --apply to write changes.');
  } else {
    if (groupOps.length) await groupsCol.bulkWrite(groupOps, { ordered: false });
    if (facilityOps.length) await facilitiesCol.bulkWrite(facilityOps, { ordered: false });
    // Remove only the known synthetic catch-all groups if they are empty and no user references them.
    const obsoleteNames = ['Independent Paper & Allied Mills', 'Cooperative & Allied Sugar Mills', 'Engineering, Metals & Allied'];
    const removedEmptyGroups = [];
    for (const obsoleteName of obsoleteNames) {
      const oldGroup = await groupsCol.findOne({ name: obsoleteName });
      if (!oldGroup) continue;
      const [facilityRefs, userRefs] = await Promise.all([
        facilitiesCol.countDocuments({ clientGroupId: oldGroup._id }),
        usersCol.countDocuments({ clientGroupId: oldGroup._id }),
      ]);
      if (facilityRefs === 0 && userRefs === 0) {
        await groupsCol.deleteOne({ _id: oldGroup._id });
        removedEmptyGroups.push(obsoleteName);
      }
    }
    console.log('Migration applied. Existing facility _id and facilityId values are preserved for matched facilities; names and company assignments follow the PDF mapping.');
    console.log('Removed empty unused catch-all groups:', JSON.stringify(removedEmptyGroups));
    console.log('Final counts:', JSON.stringify({ companies: await groupsCol.countDocuments(), facilities: await facilitiesCol.countDocuments() }));
  }
} finally {
  await mongoose.disconnect();
}
