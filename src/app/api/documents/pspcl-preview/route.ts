import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { buildPspclBillFromCsv, mapRowToPspclBill } from '@/lib/pspclBillPreview';
import { resolveDriveDocumentForPreview } from '@/lib/spreadsheetFetchServer';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    documentUrl: string;
    vaultUrl?: string;
    vaultFileId?: string;
    driveFolderId?: string;
    preferredMonth?: string;
    facilityName?: string;
    facilityId?: string;
  };

  const resolved = await resolveDriveDocumentForPreview({
    documentUrl: body.documentUrl,
    vaultUrl: body.vaultUrl,
    vaultFileId: body.vaultFileId,
    driveFolderId: body.driveFolderId,
  });

  const facilityLabel = body.facilityName || body.facilityId;
  const { bill, rows } = resolved.csvText
    ? buildPspclBillFromCsv(resolved.csvText, {
        preferredMonth: body.preferredMonth,
        facilityName: facilityLabel,
      })
    : { bill: mapRowToPspclBill(null, facilityLabel), rows: [] };

  return NextResponse.json({
    success: true,
    data: {
      bill,
      availableMonths: rows.map((r) => r.month),
      filePreviewEmbedUrl: resolved.filePreviewEmbedUrl,
      openInDriveUrl: resolved.openInDriveUrl,
      resolvedFileId: resolved.resolvedFileId,
      resolvedFileName: resolved.resolvedFileName,
      resolveNote: resolved.resolveNote,
      sourceType: resolved.sourceType,
      parsedFromExcel: Boolean(resolved.csvText),
    },
  });
}