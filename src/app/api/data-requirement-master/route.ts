import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import {
  CHECKLIST_MASTER_VERSION,
  DATA_REQUIREMENT_MASTER,
  MASTER_REQUIREMENT_CATEGORIES,
  masterRowsByCategory,
} from '@/lib/dataRequirementMaster';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      versionId: CHECKLIST_MASTER_VERSION,
      categories: MASTER_REQUIREMENT_CATEGORIES,
      requirements: DATA_REQUIREMENT_MASTER,
      byCategory: masterRowsByCategory(),
    },
  });
}