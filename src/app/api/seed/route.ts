import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seedData';
import { authorizeRole, getSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json(
      { success: false, error: 'Only an administrator can seed the demo database.' },
      { status: 403 }
    );
  }

  try {
    const summary = await seedDatabase();

    return NextResponse.json({
      success: true,
      message: 'Demo database seeded successfully.',
      data: summary,
    });
  } catch (error) {
    console.error('Database seed failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database seed failed.',
      },
      { status: 500 }
    );
  }
}
