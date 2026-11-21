
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!uri) {
  throw new Error('MONGODB_URI or MONGO_URL is missing');
}

try {
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  const groups = await db.collection('clientgroups').find({}).toArray();

  const clients = await db.collection('users')
    .find({ role: 'CLIENT' })
    .toArray();

  const facilities = await db.collection('facilities').find({}).toArray();

  console.log('\nCLIENT PROVISIONING VERIFICATION\n');

  let totalAssigned = 0;
  let invalidAssignments = 0;

  for (const client of clients) {
    const assignedIds = (client.authorizedFacilityIds || []).map(String);

    const group = groups.find(
      g => String(g._id) === String(client.clientGroupId)
    );

    const ownedFacilities = facilities.filter(
      f => String(f.clientGroupId) === String(client.clientGroupId)
    );

    const unauthorized = assignedIds.filter(id =>
      !ownedFacilities.some(f => String(f.facilityId) === id)
    );

    totalAssigned += assignedIds.length;
    invalidAssignments += unauthorized.length;

    console.log({
      email: client.email,
      company: group?.name || 'GROUP NOT FOUND',
      assignedFacilities: assignedIds.length,
      actualGroupFacilities: ownedFacilities.length,
      unauthorizedFacilityIds: unauthorized
    });
  }

  console.log('\nSUMMARY');
  console.log({
    clientAccounts: clients.length,
    totalFacilities: facilities.length,
    totalAssigned,
    invalidAssignments
  });

} catch (error) {
  console.error('Verification failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
