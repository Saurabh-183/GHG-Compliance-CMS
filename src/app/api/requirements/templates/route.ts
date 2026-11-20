import { NextRequest, NextResponse } from 'next/server';
import { BRSR_REQUEST_TEMPLATES, BRSR_CATEGORY_LABELS } from '@/lib/brsrRequestTemplates';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      templates: BRSR_REQUEST_TEMPLATES,
      categoryLabels: BRSR_CATEGORY_LABELS,
    },
  });
}