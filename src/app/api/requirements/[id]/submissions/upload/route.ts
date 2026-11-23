import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import {
  buildVaultContextFromRequirement,
  uploadBytesToComplianceVault,
  VaultPlacementError,
} from '@/lib/driveVaultServer';
import { upsertClientSubmissionLink } from '@/lib/clientSubmissionLinkUpsert';
import { GOOGLE_DRIVE_FOLDER_URL, GOOGLE_DRIVE_FOLDER_ID, resolveComplianceVaultFolderUrl, rewriteLegacyVaultUrlsInText } from '@/lib/gdrive';
import { assertClientCanSubmitRequirement } from '@/lib/dataRequestDueDate';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    if (!session || session.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only authorized client users can upload evidence.' }, { status: 403 });
    }

    const requirement = await DataRequirementModel.findById(id);
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, requirement.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      assertClientCanSubmitRequirement(requirement.dueDate);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Submission window closed.' },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 25 MB limit.' }, { status: 400 });
    }

    const description = String(form.get('description') || 'Client file upload via portal').trim();
    const reportingMonth = form.get('reportingMonth') ? String(form.get('reportingMonth')) : undefined;

    if (requirement.monthlyFrequency && reportingMonth) {
      if (!(requirement.reportingMonths || []).includes(reportingMonth)) {
        return NextResponse.json({ error: 'Invalid reporting month.' }, { status: 400 });
      }
    }

    const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId }).lean();
    let clientGroupCode: string | undefined;
    let clientGroupName: string | undefined;
    if (facility?.clientGroupId) {
      const group = await ClientGroupModel.findById(facility.clientGroupId).lean();
      clientGroupCode = group?.code;
      clientGroupName = group?.name;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeBaseName = file.name.replace(/[^\w.\-()+ ]/g, '_').slice(0, 120);
    const vaultCtx = buildVaultContextFromRequirement(
      {
        facilityId: requirement.facilityId,
        period: requirement.period,
        title: requirement.title,
        category: requirement.category,
        linkedCompliances: requirement.linkedCompliances || [],
      },
      clientGroupCode,
      clientGroupName,
      facility?.name,
      description
    );
    const fileName = `${vaultCtx.fileName}_${safeBaseName}`;

    let placement;
    try {
      placement = await uploadBytesToComplianceVault({
        vaultFolderPath: vaultCtx.vaultFolderPath,
        fileName,
        mimeType: file.type || 'application/octet-stream',
        buffer,
      });
    } catch (err) {
      if (err instanceof VaultPlacementError) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      throw err;
    }

    const submitterName = session.name || 'Client User';
    const destinationFolderUrl = resolveComplianceVaultFolderUrl(GOOGLE_DRIVE_FOLDER_URL);
    const storedLink = {
      url: destinationFolderUrl,
      vaultUrl: destinationFolderUrl,
      vaultFolderUrl: destinationFolderUrl,
      vaultTargetFolderId: GOOGLE_DRIVE_FOLDER_ID,
      vaultFileId: placement.vaultFileId,
      vaultFolderPath: vaultCtx.vaultFolderPath,
      vaultCategory: vaultCtx.vaultCategory,
      fileName,
      description,
      submittedAt: new Date(),
      submittedBy: submitterName,
      sourceUrl: destinationFolderUrl,
      mappingStatus: 'PENDING' as const,
      ingestionMode:
        placement.vaultTargetFolderId === 'local-dev-vault'
          ? ('VAULT_INDEXED' as const)
          : ('DRIVE_API_COPIED' as const),
      ...(reportingMonth ? { mappedMonth: reportingMonth } : {}),
    };

    const { linkIndex, replaced } = upsertClientSubmissionLink(requirement, storedLink, reportingMonth);

    const submissionVersion = (requirement.submissionVersion || 0) + 1;
    requirement.submissionVersion = submissionVersion;
    requirement.submissionHistory = requirement.submissionHistory || [];
    requirement.submissionHistory.push({
      version: submissionVersion,
      submittedAt: new Date(),
      submittedBy: submitterName,
      driveLinkIndexes: [linkIndex],
    });

    const submittedMonths = new Set(
      requirement.submittedDriveLinks.map((entry) => entry.mappedMonth).filter(Boolean)
    );
    const allMonthsReceived =
      !requirement.monthlyFrequency ||
      (requirement.reportingMonths || []).every((month) => submittedMonths.has(month));
    requirement.submissionStatus = allMonthsReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    requirement.verificationStatus = 'UNDER_REVIEW';
    requirement.workflowStatus = submissionVersion > 1 ? 'RESUBMITTED' : 'SUBMITTED';

    await requirement.save();

    const localDev = placement.vaultTargetFolderId === 'local-dev-vault';
    return NextResponse.json({
      success: true,
      message: replaced
        ? localDev
          ? 'Previous evidence replaced; new file saved (local dev vault — configure GDRIVE_SERVICE_ACCOUNT_* to sync to Google Drive).'
          : 'Previous evidence replaced; new file saved in the compliance vault folder.'
        : localDev
          ? 'File saved (local dev vault). Your consultant can open it from the submission; add Google Drive service account later for automatic vault sync.'
          : 'File saved in the compliance vault folder.',
      vault: {
        folderPath: vaultCtx.vaultFolderPath,
        folderUrl: destinationFolderUrl,
        vaultUrl: placement.vaultUrl,
        vaultFileId: placement.vaultFileId,
        uploadedToVault: true,
      },
    });
  } catch (error) {
    console.error('Client vault upload failed:', error);
    return NextResponse.json({ error: 'Upload could not be saved. Please try again.' }, { status: 500 });
  }
}