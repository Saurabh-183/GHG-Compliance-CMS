import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!uri) throw new Error('MONGODB_URI or MONGO_URL is required.');
if (!name || !email || !password || password.length < 12) throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters).');
await mongoose.connect(uri);
try {
  const users = mongoose.connection.collection('users');
  const existing = await users.findOne({ email });
  if (existing) throw new Error(`An account already exists for ${email}. Use the admin user-management screen or a controlled password reset instead.`);
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await users.insertOne({ name, email, passwordHash, role: 'ADMIN', status: 'ACTIVE', mustChangePassword: false, authorizedFacilityIds: [], createdAt: new Date(), updatedAt: new Date() });
  console.log(`Administrator created: ${email} (${result.insertedId})`);
} finally { await mongoose.disconnect(); }
