import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';

export interface ClientUploadListItem {
  requirementId: string;
  requirementTitle: string;
  facilityId: string;
  period: string;
  linkIndex: number;
  url: string;
  sourceUrl?: string;
  vaultUrl?: string;
  vaultFolderPath?: string;
  vaultFolderUrl?: string;
  vaultCategory?: string;
  vaultFileId?: string;
  driveFolderId?: string;
  vaultTargetFolderId?: string;
  fileName?: string;
  ingestionMode?: string;
  description: string;
  submittedAt: string;
  submittedBy: string;
  mappingStatus?: string;
  mappedMonth?: string;
  mappedDatasetId?: string;
  verificationNotes?: string;
  verificationStatus: string;
  submissionStatus: string;
  requestId?: string;
  requiredFields?: Array<{ key: string; label: string; type: string; required: boolean }>;
  fieldReviews?: Array<{ fieldKey: string; status: string; comment?: string }>;
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const facilityId = request.nextUrl.searchParams.get('facilityId')?.toUpperCase();
  const mappingStatus = request.nextUrl.searchParams.get('mappingStatus');

  try {
    await connectToDatabase();

    const query: { facilityId?: string | { $in: string[] }; 'submittedDriveLinks.0': { $exists: boolean } } = {
      'submittedDriveLinks.0': { $exists: true },
    };
    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      query.facilityId = facilityId;
    } else if (session?.role === 'CONSULTANT') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
    }

    const requirements = await DataRequirementModel.find(query).sort({ updatedAt: -1 }).lean();

    const items: ClientUploadListItem[] = [];

    for (const req of requirements) {
      req.submittedDriveLinks.forEach((link, linkIndex) => {
        if (mappingStatus && link.mappingStatus !== mappingStatus) return;

        items.push({
          requirementId: req._id.toString(),
          requirementTitle: req.title,
          facilityId: req.facilityId,
          period: req.period,
          linkIndex,
          url: link.url,
          sourceUrl: link.sourceUrl,
          vaultUrl: link.vaultUrl,
          vaultFolderPath: link.vaultFolderPath,
          vaultFolderUrl: link.vaultFolderUrl,
          vaultCategory: link.vaultCategory,
          vaultFileId: link.vaultFileId,
          driveFolderId: link.driveFolderId,
          vaultTargetFolderId: link.vaultTargetFolderId,
          fileName: link.fileName,
          ingestionMode: link.ingestionMode,
          description: link.description,
          submittedAt:
            link.submittedAt instanceof Date
              ? link.submittedAt.toISOString()
              : String(link.submittedAt),
          submittedBy: link.submittedBy,
          mappingStatus: link.mappingStatus || 'PENDING',
          mappedMonth: link.mappedMonth,
          mappedDatasetId: link.mappedDatasetId?.toString(),
          verificationNotes: link.verificationNotes,
          verificationStatus: req.verificationStatus,
          submissionStatus: req.submissionStatus,
          requestId: req.requestId,
          requiredFields: req.requiredFields,
          fieldReviews: req.fieldReviews,
        });
      });
    }

    items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return NextResponse.json({ success: true, data: items, total: items.length });
  } catch (error) {
    console.error('client-uploads request failed:', error);
    return NextResponse.json({ error: 'Unable to load client uploads.' }, { status: 503 });

  }
}
