import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(
    process.env.MONGODB_URI || process.env.MONGO_URL
  );

  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();

  for (const facilityId of ['UNIT_1', 'UNIT2']) {
    console.log('\nFACILITY:', facilityId);

    for (const collection of collections) {
      const col = db.collection(collection.name);

      const count = await col.countDocuments({
        facilityId
      });

      if (count > 0) {
        console.log(`${collection.name}: ${count} records`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  });
