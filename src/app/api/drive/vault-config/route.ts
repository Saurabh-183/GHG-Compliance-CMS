import { NextResponse } from 'next/server';
import { GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';
import { COMPLIANCE_VAULT_SHARED_URL } from '@/lib/driveVaultShared';
import { isDriveVaultSyncConfigured } from '@/lib/driveVaultServer';

export async function GET() {
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