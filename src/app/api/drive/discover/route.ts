import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { discoverDriveTree } from '@/lib/driveInventory';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json({ success: false, error: 'Only administrators can run the initial Drive discovery.' }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const rootFolderId = String(body.rootFolderId || process.env.GDRIVE_DISCOVERY_ROOT_FOLDER_ID || '').trim();
    if (!rootFolderId || !/^[a-zA-Z0-9_-]+$/.test(rootFolderId)) {
      return NextResponse.json({ success: false, error: 'Configure GDRIVE_DISCOVERY_ROOT_FOLDER_ID or provide rootFolderId.' }, { status: 400 });
    }
    const result = await discoverDriveTree(rootFolderId);
    return NextResponse.json({ success: true, message: 'Google Drive discovery completed. Existing Drive files were not moved or modified.', data: result });
  } catch (error) {
    console.error('Drive discovery failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Drive discovery failed.' }, { status: 502 });
  }
}
