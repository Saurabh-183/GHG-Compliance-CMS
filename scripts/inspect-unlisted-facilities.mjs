import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(
    process.env.MONGODB_URI || process.env.MONGO_URL
  );

  const db = mongoose.connection.db;

  const facilities = db.collection('facilities');
  const groups = db.collection('clientgroups');
  const applicability = db.collection('complianceapplicabilities');

  for (const facilityId of ['UNIT_1', 'UNIT2']) {
    const facility = await facilities.findOne({ facilityId });

    console.log('\n================================');
    console.log('FACILITY:', facilityId);
    console.log('================================');

    if (!facility) {
      console.log('Facility not found');
      continue;
    }

    const group = await groups.findOne({
      _id: facility.clientGroupId
    });

    console.log('Facility details:');
    console.log(JSON.stringify(facility, null, 2));

    console.log('\nParent company:');
    console.log(JSON.stringify(group, null, 2));

    const records = await applicability.find({
      facilityId
    }).toArray();

    console.log('\nApplicability records:');
    console.log(JSON.stringify(records, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  });
