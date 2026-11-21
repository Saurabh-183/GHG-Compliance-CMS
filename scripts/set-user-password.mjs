import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
const email = process.env.TARGET_EMAIL?.trim().toLowerCase();
const password = process.env.NEW_PASSWORD;
if (!uri || !email || !password || password.length < 12) throw new Error('Set MONGODB_URI, TARGET_EMAIL and NEW_PASSWORD (minimum 12 characters).');
await mongoose.connect(uri);
try {
  const users = mongoose.connection.collection('users');
  const result = await users.updateOne({ email }, { $set: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true, passwordChangedAt: new Date(), updatedAt: new Date() } });
  if (!result.matchedCount) throw new Error(`No account found for ${email}.`);
  console.log(`Password reset for ${email}. The account will be prompted to change it after signing in.`);
} finally { await mongoose.disconnect(); }
