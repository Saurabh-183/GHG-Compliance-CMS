import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';
import { COMPLIANCE_VAULT_SHARED_URL } from '@/lib/driveVaultShared';
import { isDriveVaultSyncConfigured } from '@/lib/driveVaultServer';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      autoUploadEnabled: isDriveVaultSyncConfigured(),
      vaultRootFolderId: GOOGLE_DRIVE_FOLDER_ID,
      vaultRootFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
      sharedWithMeUrl: COMPLIANCE_VAULT_SHARED_URL,
      folderStructureRoot: 'Client_Submissions',
    },
  });
}
