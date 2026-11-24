import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { parseGoogleDriveUrl } from '@/lib/driveVaultShared';
import {
  ingestClientDriveLink,
  isDriveVaultSyncConfigured,
  VaultPlacementError,
} from '@/lib/driveVaultServer';
import { upsertClientSubmissionLink } from '@/lib/clientSubmissionLinkUpsert';
import {
  GOOGLE_DRIVE_FOLDER_URL,
  GOOGLE_DRIVE_FOLDER_ID,
  resolveComplianceVaultFolderUrl,
} from '@/lib/gdrive';
import { assertClientCanSubmitRequirement } from '@/lib/dataRequestDueDate';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    const requirement = await DataRequirementModel.findById(id);
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    if (!session || session.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only authorized client users can submit requested data.' }, { status: 403 });
    }

    if (!isAuthorizedForFacility(session, requirement.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      url?: string; description?: string; reportingMonth?: string; draft?: boolean;
      utilityConnection?: { providerName: string; connectionType: string; subDivision: string; circle: string; consumerAccountNumber: string; consumerName: string; meterNumber: string; contractDemand: string };
      billDetails?: { invoiceNumber: string; billingFrom: string; billingTo: string; consumptionKwh: number; billAmount: number };
      structuredData?: Record<string, unknown>;
      comment?: string;
    };

    if (!body.draft) {
      try {
        assertClientCanSubmitRequirement(requirement.dueDate);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Submission window closed.' },
          { status: 403 }
        );
      }
    }

    if (body.draft) {
      requirement.clientDraftData = {
        structuredData: body.structuredData || {},
        comment: body.comment?.trim(),
        updatedAt: new Date(),
        updatedBy: session?.name || 'Client User',
      };
      if (['REQUESTED', 'CHANGES_REQUESTED', 'IN_PROGRESS'].includes(requirement.workflowStatus || 'REQUESTED')) {
        requirement.workflowStatus = 'IN_PROGRESS';
      }
      await requirement.save();
      return NextResponse.json({ success: true, message: 'Draft saved. You can submit when ready.', data: requirement });
    }

    if (!body.url || !/^https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(body.url.trim())) {
      return NextResponse.json({ error: 'A valid Google Drive URL is required' }, { status: 400 });
    }
    if (requirement.monthlyFrequency) {
      if (!body.reportingMonth || !(requirement.reportingMonths || []).includes(body.reportingMonth)) {
        return NextResponse.json({ error: 'Select a valid reporting month requested by the consultant.' }, { status: 400 });
      }
    }

    const connection = body.utilityConnection;
    const bill = body.billDetails;
    const isElectricityRequest = /electricity|grid|discom|power bill/i.test(`${requirement.title} ${requirement.description}`);
    if (isElectricityRequest && (!connection || ![connection.providerName, connection.connectionType, connection.subDivision, connection.circle, connection.consumerAccountNumber, connection.consumerName, connection.meterNumber, connection.contractDemand].every((value) => typeof value === 'string' && value.trim()) || !bill || !bill.invoiceNumber?.trim() || !bill.billingFrom || !bill.billingTo ||
        !Number.isFinite(Number(bill.consumptionKwh)) || Number(bill.consumptionKwh) < 0 ||
        !Number.isFinite(Number(bill.billAmount)) || Number(bill.billAmount) < 0)) {
      return NextResponse.json({ error: 'Complete the electricity connection and bill details before submitting.' }, { status: 400 });
    }

    const parsed = parseGoogleDriveUrl(body.url);
    if (!parsed.resourceId) {
      return NextResponse.json(
        { error: 'Could not parse Google Drive link. Use a share link to a file or folder.' },
        { status: 400 }
      );
    }

    const submitterName = session?.name || 'Client User';
    if (isElectricityRequest && connection) {
      const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId });
      if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
      facility.set('utilityConnection', { ...connection, updatedAt: new Date(), updatedBy: submitterName });
      await facility.save();
    }

    const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId }).lean();
    let clientGroupCode: string | undefined;
    let clientGroupName: string | undefined;
    if (facility?.clientGroupId) {
      const group = await ClientGroupModel.findById(facility.clientGroupId).lean();
      clientGroupCode = group?.code;
      clientGroupName = group?.name;
    }

    let vaultEntry;
    try {
      vaultEntry = await ingestClientDriveLink({
        sourceUrl: body.url.trim(),
        description: body.description || 'Supporting documentation via Client Portal',
        submittedBy: submitterName,
        requirement,
        clientGroupCode,
        clientGroupName,
        facilityName: facility?.name,
      });
    } catch (err) {
      if (err instanceof VaultPlacementError) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      throw err;
    }

    if (parsed.resourceType === 'folder' && parsed.resourceId) {
      const { pickPrimarySpreadsheetInFolder } = await import('@/lib/spreadsheetFetchServer');
      const primary = await pickPrimarySpreadsheetInFolder(parsed.resourceId);
      if (primary?.id) {
        vaultEntry.vaultFileId = primary.id;
        vaultEntry.vaultUrl = `https://drive.google.com/file/d/${primary.id}/view`;
        vaultEntry.url = vaultEntry.vaultUrl;
        if (primary.name) vaultEntry.fileName = primary.name;
      }
    }

    const storedLink = {
      ...vaultEntry,
      vaultFolderUrl: resolveComplianceVaultFolderUrl(vaultEntry.vaultFolderUrl || GOOGLE_DRIVE_FOLDER_URL),
      vaultTargetFolderId: GOOGLE_DRIVE_FOLDER_ID,
      ...(body.reportingMonth ? { mappedMonth: body.reportingMonth } : {}),
      ...(isElectricityRequest && bill && connection
        ? {
            billDetails: {
              ...bill,
              invoiceNumber: bill.invoiceNumber.trim(),
              consumptionKwh: Number(bill.consumptionKwh),
              billAmount: Number(bill.billAmount),
            },
            utilityConnectionSnapshot: connection,
          }
        : {}),
    };

    const { linkIndex, replaced } = upsertClientSubmissionLink(
      requirement,
      storedLink,
      body.reportingMonth
    );

    const submissionVersion = (requirement.submissionVersion || 0) + 1;
    requirement.submissionVersion = submissionVersion;
    requirement.submissionHistory = requirement.submissionHistory || [];
    requirement.submissionHistory.push({
      version: submissionVersion,
      submittedAt: new Date(),
      submittedBy: submitterName,
      comment: body.comment?.trim(),
      driveLinkIndexes: [linkIndex],
      structuredData: body.structuredData,
    });

    if (replaced) {
      requirement.fieldReviews = (requirement.fieldReviews || []).map((review) => ({
        ...review,
        status: 'PENDING' as const,
        comment: undefined,
        reviewedAt: undefined,
        reviewedBy: undefined,
      }));
    }

    if (body.structuredData && typeof body.structuredData === 'object') {
      requirement.latestStructuredData = body.structuredData;
    }

    const submittedMonths = new Set(requirement.submittedDriveLinks.map((entry) => entry.mappedMonth).filter(Boolean));
    const allMonthsReceived = !requirement.monthlyFrequency || (requirement.reportingMonths || []).every((month) => submittedMonths.has(month));
    requirement.submissionStatus = allMonthsReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    requirement.verificationStatus = 'UNDER_REVIEW';
    requirement.workflowStatus = submissionVersion > 1 ? 'RESUBMITTED' : 'SUBMITTED';
    requirement.history = requirement.history || [];
    requirement.history.push({ status: requirement.workflowStatus, changedAt: new Date(), changedBy: submitterName, comment: body.comment?.trim() });
    requirement.reviewNote = undefined;
    requirement.reviewedByName = undefined;
    requirement.reviewedAt = undefined;

    await requirement.save();

    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({
        recipientRole: 'CONSULTANT',
        senderRole: 'CLIENT',
        senderName: submitterName,
        type: 'EVIDENCE_SUBMITTED',
        title: 'New Client Evidence Submitted',
        message: `${submitterName} submitted Google Drive document for "${requirement.title}" (${requirement.facilityId}). Vault: ${vaultEntry.vaultFolderPath}`,
        facilityId: requirement.facilityId,
        linkUrl: '/client-uploads',
        isRead: false,
        createdAt: new Date(),
      });
      await Notification.create({
        recipientRole: 'ADMIN',
        senderRole: 'CLIENT',
        senderName: submitterName,
        type: 'EVIDENCE_SUBMITTED',
        title: 'Client document ingested to vault',
        message: `"${requirement.title}" — indexed at ${vaultEntry.vaultFolderPath}`,
        facilityId: requirement.facilityId,
        linkUrl: '/client-uploads',
        isRead: false,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }

    const uploadedToVault = vaultEntry.ingestionMode === 'DRIVE_API_COPIED';

    return NextResponse.json({
      success: true,
      message: replaced
        ? uploadedToVault
          ? 'Previous evidence replaced with your new document in the compliance vault.'
          : 'Previous evidence link replaced with your new submission.'
        : uploadedToVault
          ? 'Document copied into the shared compliance Drive vault with folder structure.'
          : isDriveVaultSyncConfigured()
            ? 'Vault sync attempted; link indexed. Check Drive API permissions if the file is missing.'
            : 'Document indexed in vault path (enable service account in .env for automatic Drive upload).',
      data: requirement,
      vault: {
        folderPath: vaultEntry.vaultFolderPath,
        folderUrl: vaultEntry.vaultFolderUrl,
        vaultUrl: vaultEntry.vaultUrl,
        vaultFileId: vaultEntry.vaultFileId,
        targetFolderId: vaultEntry.vaultTargetFolderId,
        ingestionMode: vaultEntry.ingestionMode,
        uploadedToVault,
      },
    });
  } catch (error) {
    console.error('Error submitting client data request:', error);
    return NextResponse.json({ error: 'Submission could not be saved. Please try again.' }, { status: 500 });
  }
}
