import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { buildPspclBillFromCsv, mapRowToPspclBill } from '@/lib/pspclBillPreview';
import { resolveDriveDocumentForPreview } from '@/lib/spreadsheetFetchServer';
import {
  isElectricityEvidenceContext,
  parseSpreadsheetPreviewTable,
  structuredDataToDisplayRows,
} from '@/lib/genericSpreadsheetPreview';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    requirementId?: string;
    linkIndex?: number;
    documentUrl?: string;
    vaultUrl?: string;
    vaultFileId?: string;
    driveFolderId?: string;
    preferredMonth?: string;
    facilityName?: string;
    facilityId?: string;
    dataCategory?: string;
    requirementTitle?: string;
    sourceChecklistItemKey?: string;
  };

  let structuredData: Record<string, unknown> | undefined;
  let requiredFields: Array<{ key: string; label: string; type: string; required: boolean }> | undefined;
  let fieldReviews:
    | Array<{ fieldKey: string; status: string; comment?: string }>
    | undefined;

  if (body.requirementId) {
    try {
      await connectToDatabase();
      const req = await DataRequirementModel.findById(body.requirementId).lean();
      if (req) {
        structuredData =
          (typeof req.latestStructuredData === 'object' && req.latestStructuredData
            ? req.latestStructuredData
            : undefined) ||
          (req.clientDraftData?.structuredData as Record<string, unknown> | undefined);

        const linkIdx = body.linkIndex ?? 0;
        const link = req.submittedDriveLinks?.[linkIdx];
        const history = req.submissionHistory || [];
        const versionWithData = [...history].reverse().find((h) => h.driveLinkIndexes?.includes(linkIdx));
        if (versionWithData?.structuredData && typeof versionWithData.structuredData === 'object') {
          structuredData = {
            ...(structuredData || {}),
            ...versionWithData.structuredData,
          };
        }

        if (link && !structuredData && link.description) {
          structuredData = { submission_note: link.description };
        }

        requiredFields = req.requiredFields as typeof requiredFields;
        fieldReviews = req.fieldReviews as typeof fieldReviews;

        if (!body.requirementTitle) body.requirementTitle = req.title;
        if (!body.dataCategory) body.dataCategory = req.dataCategory;
        if (!body.sourceChecklistItemKey) body.sourceChecklistItemKey = req.sourceChecklistItemKey;
        if (!body.facilityId) body.facilityId = req.facilityId;
      }
    } catch (e) {
      console.error('submission-preview requirement load:', e);
    }
  }

  const resolved = await resolveDriveDocumentForPreview({
    documentUrl: body.documentUrl,
    vaultUrl: body.vaultUrl,
    vaultFileId: body.vaultFileId,
    driveFolderId: body.driveFolderId,
  });

  const facilityLabel = body.facilityName || body.facilityId || 'Facility';
  const electricity = isElectricityEvidenceContext({
    dataCategory: body.dataCategory,
    requirementTitle: body.requirementTitle,
    sourceChecklistItemKey: body.sourceChecklistItemKey,
  });

  const { headers, rows } = resolved.csvText
    ? parseSpreadsheetPreviewTable(resolved.csvText)
    : { headers: [] as string[], rows: [] };

  if (rows.length && (!structuredData || !Object.keys(structuredData).length)) {
    const first = rows[0]?.cells || {};
    const fromSheet: Record<string, unknown> = {};
    Object.entries(first).forEach(([k, v]) => {
      if (v) fromSheet[k] = v;
    });
    if (Object.keys(fromSheet).length) structuredData = fromSheet;
  }

  const labelByKey = new Map((requiredFields || []).map((f) => [f.key, f.label]));
  const structuredRows = structuredDataToDisplayRows(structuredData, labelByKey);

  const pspcl =
    electricity && resolved.csvText
      ? buildPspclBillFromCsv(resolved.csvText, {
          preferredMonth: body.preferredMonth,
          facilityName: facilityLabel,
        })
      : { bill: mapRowToPspclBill(null, facilityLabel), rows: [] as { month: string }[] };

  return NextResponse.json({
    success: true,
    data: {
      filePreviewEmbedUrl: resolved.filePreviewEmbedUrl,
      openInDriveUrl: resolved.openInDriveUrl,
      resolveNote: resolved.resolveNote,
      resolvedFileName: resolved.resolvedFileName,
      parsedFromExcel: Boolean(resolved.csvText),
      isElectricityBill: electricity,
      bill: pspcl.bill,
      availableMonths: pspcl.rows.map((r) => r.month),
      structuredData,
      structuredRows,
      requiredFields,
      fieldReviews,
      spreadsheetHeaders: headers,
      spreadsheetRows: rows,
    },
  });
}