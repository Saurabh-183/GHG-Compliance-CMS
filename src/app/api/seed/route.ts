import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seedData';

export async function POST() {
  try {
    const summary = await seedDatabase();
    return NextResponse.json({
      success: true,
      message: 'Demo database re-seeded successfully with Trident Group demo data!',
      data: summary,
    });
  } catch (error) {
    console.error('API Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Database seeding failed' },
      { status: 500 }
    );
  }
}
