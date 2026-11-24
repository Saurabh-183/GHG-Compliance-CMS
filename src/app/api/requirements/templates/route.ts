import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { CONSULTANT_REQUEST_TEMPLATES, DATA_CATEGORIES } from '@/lib/dataRequestCategories';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      templates: CONSULTANT_REQUEST_TEMPLATES,
      categoryLabels: Object.fromEntries(DATA_CATEGORIES.map((c) => [c, c])),
    },
  });
}