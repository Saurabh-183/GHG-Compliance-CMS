import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);

try {
  const db = mongoose.connection.db;
  const facilities = db.collection('facilities');
  const groups = db.collection('clientgroups');

  const facility = await facilities.findOne({
    facilityId: 'SUGAR_SEMIKHERA'
  });

  const oldGroup = await groups.findOne({
    name: 'Cooperative & Allied Sugar Mills'
  });

  const newGroup = await groups.findOne({
    name: 'Kisan Sahkari Chinni Mills Ltd, Semikhera'
  });

  if (!facility) throw new Error('Semikhera facility not found');
  if (!oldGroup || !newGroup) throw new Error('Expected company group not found');

  if (String(facility.clientGroupId) !== String(oldGroup._id)) {
    throw new Error('Current assignment differs from expected; update aborted');
  }

  const result = await facilities.updateOne(
    { _id: facility._id, clientGroupId: oldGroup._id },
    {
      $set: {
        name: 'Kisan Sahkari Chinni Mills Ltd, Semikhera',
        clientGroupId: newGroup._id,
        updatedAt: new Date()
      }
    }
  );

  console.log(JSON.stringify({
    matched: result.matchedCount,
    modified: result.modifiedCount,
    facilityId: facility.facilityId,
    newCompany: newGroup.name
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
