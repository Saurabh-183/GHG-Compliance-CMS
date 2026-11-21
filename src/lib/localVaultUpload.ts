import 'server-only';

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';

const VAULT_ROOT = path.join(process.cwd(), '.data', 'compliance-vault');
const INDEX_DIR = path.join(VAULT_ROOT, '_index');

export type LocalVaultFileMeta = {
  fileId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  vaultFolderPath: string;
  createdAt: string;
};

export async function saveLocalVaultUpload(args: {
  vaultFolderPath: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{
  vaultUrl: string;
  vaultFolderUrl: string;
  vaultTargetFolderId: string;
  vaultFileId: string;
}> {
  const fileId = crypto.randomUUID();
  const folderParts = args.vaultFolderPath.split('/').filter(Boolean);
  const dir = path.join(VAULT_ROOT, ...folderParts);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(INDEX_DIR, { recursive: true });

  const dest = path.join(dir, args.fileName);
  await fs.writeFile(dest, args.buffer);

  const relativePath = path.relative(VAULT_ROOT, dest).replace(/\\/g, '/');
  const meta: LocalVaultFileMeta = {
    fileId,
    relativePath,
    fileName: args.fileName,
    mimeType: args.mimeType || 'application/octet-stream',
    vaultFolderPath: args.vaultFolderPath,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(INDEX_DIR, `${fileId}.json`), JSON.stringify(meta), 'utf8');

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    vaultUrl: `${base}/api/client-vault-files/${fileId}`,
    vaultFolderUrl: GOOGLE_DRIVE_FOLDER_URL,
    vaultTargetFolderId: 'local-dev-vault',
    vaultFileId: fileId,
  };
}

export async function readLocalVaultFileMeta(fileId: string): Promise<LocalVaultFileMeta | null> {
  if (!/^[a-f0-9-]{36}$/i.test(fileId)) return null;
  try {
    const raw = await fs.readFile(path.join(INDEX_DIR, `${fileId}.json`), 'utf8');
    return JSON.parse(raw) as LocalVaultFileMeta;
  } catch {
    return null;
  }
}

export async function readLocalVaultFileBytes(meta: LocalVaultFileMeta): Promise<Buffer> {
  const full = path.join(VAULT_ROOT, meta.relativePath);
  const resolved = path.resolve(full);
  const rootResolved = path.resolve(VAULT_ROOT);
  if (!resolved.startsWith(rootResolved)) {
    throw new Error('Invalid vault path');
  }
  return fs.readFile(resolved);
}