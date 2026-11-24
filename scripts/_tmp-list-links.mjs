import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const docs = await mongoose.connection.db
  .collection('datarequirements')
  .find(
    { 'submittedDriveLinks.0': { $exists: true } },
    {
      projection: {
        title: 1,
        requestId: 1,
        facilityId: 1,
        period: 1,
        'submittedDriveLinks.fileName': 1,
        'submittedDriveLinks.url': 1,
        'submittedDriveLinks.vaultUrl': 1,
        'submittedDriveLinks.vaultFileId': 1,
        'submittedDriveLinks.ingestionMode': 1,
        'submittedDriveLinks.description': 1,
        'submittedDriveLinks.submittedBy': 1,
      },
    }
  )
  .toArray();

console.log('count', docs.length);
for (const d of docs) {
  console.log('---', d.facilityId, d.period, d.requestId, d.title);
  for (const l of d.submittedDriveLinks || []) {
    console.log(
      JSON.stringify({
        fileName: l.fileName,
        mode: l.ingestionMode,
        by: l.submittedBy,
        vaultFileId: l.vaultFileId,
        url: l.url,
        vaultUrl: l.vaultUrl,
        desc: (l.description || '').slice(0, 80),
      })
    );
  }
}
await mongoose.disconnect();
