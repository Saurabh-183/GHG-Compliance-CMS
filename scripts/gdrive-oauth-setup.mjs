/**
 * One-time setup: obtain GDRIVE_OAUTH_REFRESH_TOKEN for automatic vault copies.
 *
 * Prereqs:
 * 1. Google Cloud Console → APIs → enable Drive API
 * 2. Credentials → OAuth client ID (Desktop app or Web with redirect http://localhost:3333)
 * 3. Set in .env: GDRIVE_OAUTH_CLIENT_ID, GDRIVE_OAUTH_CLIENT_SECRET
 *
 * Run from GHG-Compliance-CMS: node scripts/gdrive-oauth-setup.mjs
 * Sign in with the Google account that owns GDRIVE_FOLDER_ID, approve Drive access.
 */
import readline from 'node:readline';
import http from 'node:http';
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
  }
}

loadEnvFile(path.join(root, '.env'));

const CLIENT_ID = process.env.GDRIVE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.GDRIVE_OAUTH_REDIRECT_URI || 'http://localhost:3333';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GDRIVE_OAUTH_CLIENT_ID and GDRIVE_OAUTH_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive'],
});

function waitForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', REDIRECT_URI);
        const code = url.searchParams.get('code');
        const err = url.searchParams.get('error');
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`OAuth error: ${err}`);
          reject(new Error(err));
          server.close();
          return;
        }
        if (!code) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorized</h1><p>You can close this tab and return to the terminal.</p>');
        server.close();
        resolve(code);
      } catch (e) {
        reject(e);
      }
    });

    server.listen(new URL(REDIRECT_URI).port || 3333, () => {
      console.log('\nOpen this URL in your browser (vault owner Google account):\n');
      console.log(authUrl);
      console.log(`\nWaiting for redirect on ${REDIRECT_URI} ...\n`);
    });

    server.on('error', reject);
  });
}

async function fallbackManualCode() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => {
    rl.question('Paste authorization code from redirect URL: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
  return code;
}

const code = (await waitForCode().catch(async () => fallbackManualCode())) || '';
if (!code) {
  console.error('No authorization code received.');
  process.exit(1);
}

const { tokens } = await oauth2.getToken(code);
if (!tokens.refresh_token) {
  console.warn(
    'No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions and run again with prompt=consent.'
  );
}

console.log('\nAdd to .env:\n');
if (tokens.refresh_token) {
  console.log(`GDRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
}
console.log('\nRestart npm run dev. Client Drive links will copy into GDRIVE_FOLDER_ID.\n');