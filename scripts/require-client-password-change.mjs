import mongoose from 'mongoose';
const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) throw new Error('MONGODB_URI or MONGO_URL is required.');
await mongoose.connect(uri);
try {
  const result = await mongoose.connection.collection('users').updateMany(
    { role: 'CLIENT' },
    { $set: { mustChangePassword: true, updatedAt: new Date() } }
  );
  console.log(`Marked ${result.modifiedCount} client accounts to change their password at next login. Password hashes were not changed.`);
} finally { await mongoose.disconnect(); }
