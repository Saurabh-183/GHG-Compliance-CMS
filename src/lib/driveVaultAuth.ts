import 'server-only';

type DriveV3 = import('googleapis').drive_v3.Drive;

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

function apiCopyDisabled(): boolean {
  return process.env.GDRIVE_ENABLE_API_COPY === 'false';
}

export function isDriveServiceAccountConfigured(): boolean {
  if (apiCopyDisabled()) return false;
  return Boolean(
    process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
      process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

/** One-time OAuth refresh token for the Google account that owns the vault folder. */
export function isDriveOAuthConfigured(): boolean {
  if (apiCopyDisabled()) return false;
  return Boolean(
    process.env.GDRIVE_OAUTH_CLIENT_ID &&
      process.env.GDRIVE_OAUTH_CLIENT_SECRET &&
      process.env.GDRIVE_OAUTH_REFRESH_TOKEN
  );
}

/** Server can copy client links / uploads into the fixed vault root folder. */
export function isDriveVaultSyncConfigured(): boolean {
  return isDriveServiceAccountConfigured() || isDriveOAuthConfigured();
}

async function createServiceAccountDriveClient(): Promise<DriveV3 | null> {
  const clientEmail = process.env.GDRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [DRIVE_SCOPE],
    });
    return google.drive({ version: 'v3', auth });
  } catch (err) {
    console.warn('Drive service-account client init failed:', err);
    return null;
  }
}

async function createOAuthDriveClient(): Promise<DriveV3 | null> {
  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const { google } = await import('googleapis');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2 });
  } catch (err) {
    console.warn('Drive OAuth client init failed:', err);
    return null;
  }
}

export async function createDriveReadClient(): Promise<DriveV3 | null> {
  const sa = await createServiceAccountDriveClient();
  if (sa) return sa;
  return createOAuthDriveClient();
}

export async function createDriveWriteClient(): Promise<DriveV3 | null> {
  if (apiCopyDisabled()) return null;
  return createDriveReadClient();
}