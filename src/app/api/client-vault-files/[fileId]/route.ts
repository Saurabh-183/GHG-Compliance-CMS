import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { readLocalVaultFileBytes, readLocalVaultFileMeta } from '@/lib/localVaultUpload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fileId } = await params;
  const meta = await readLocalVaultFileMeta(fileId);
  if (!meta) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  if (session.role === 'CLIENT') {
    // Clients may only open vault files for authorized facilities (path encodes facility id).
    const upperPath = meta.vaultFolderPath.toUpperCase();
    const allowed = session.authorizedFacilityIds?.some((id) => upperPath.includes(id.toUpperCase()));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const buffer = await readLocalVaultFileBytes(meta);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': meta.mimeType,
        'Content-Disposition': `inline; filename="${meta.fileName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
  }
}