import 'server-only';

type DriveV3 = import('googleapis').drive_v3.Drive;

export function isDriveServiceAccountConfigured(): boolean {
  if (process.env.GDRIVE_ENABLE_API_COPY === 'false') return false;
  return Boolean(
    process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
      process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export async function createDriveWriteClient(): Promise<DriveV3 | null> {
  const clientEmail = process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  } catch (err) {
    console.warn('Drive write client init failed:', err);
    return null;
  }
}