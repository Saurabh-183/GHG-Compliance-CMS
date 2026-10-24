import { seedDatabase } from '../src/lib/seedData';
import mongoose from 'mongoose';

async function main() {
  console.log('🌱 Starting Carbon Crunch database seed...');
  try {
    const result = await seedDatabase();
    console.log('✅ Seed successful!');
    console.log('Users created:', result.users);
    console.log('Client Group:', result.group);
    console.log('Facility:', result.facility);
    console.log('Dataset ID:', result.datasetId);
    console.log('Clarification ID:', result.clarificationId);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
