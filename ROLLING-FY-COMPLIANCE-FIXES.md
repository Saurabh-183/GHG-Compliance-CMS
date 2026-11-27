# Financial-Year Facility Compliance Workflow Update

This update is based on the latest `compliance-latest-source(1).zip` uploaded in this conversation.

## Intended behavior

- New facility registration does not enable any compliance framework.
- Admin assigns RCO, RPO, PAT and/or CCTS after registration.
- Applicability is stored per `facilityId + complianceType + financial year`.
- Admin can update one facility or bulk-update multiple facilities for one selected financial year.
- Only the previous, current and upcoming Indian financial years are shown.
- The matrix lists only frameworks applicable in at least one of those three years.
- Enabling a framework creates (or reuses) the corresponding assessment so the matrix cell has a real assessment destination.
- Consultant request screens display Admin-approved frameworks as read-only labels, not consultant-controlled checkboxes.
- Checklist rows returned to Consultants are filtered by the facility/year framework assignments.
- Single and bulk request APIs validate framework applicability on the server.
- Client portal and client-group views display facility-specific applicability for the selected financial year.
- Historical applicability, assessments, evidence and Drive files are not deleted by disabling a framework.

## Files changed

1. `src/models/Facility.ts`
2. `src/models/FacilityDataChecklist.ts`
3. `src/app/admin/users/page.tsx`
4. `src/app/portal/page.tsx`
5. `src/app/clients/[groupId]/page.tsx`
6. `src/app/api/facilities/route.ts`
7. `src/app/api/compliance-applicability/route.ts`
8. `src/app/api/facilities/[id]/applicable-requirements/route.ts`
9. `src/app/api/requirements/route.ts`
10. `src/app/api/requirements/bulk-checklist/route.ts`
11. `src/components/requests/ChecklistDrivenRequestWizard.tsx`
12. `src/components/requests/FacilityDataRequestPanel.tsx`

The rolling-year helper and matrix table in the supplied source already returned/rendered a three-year window, so those files were not rewritten in this pass.

## Install

1. Back up the current `src` folder.
2. Extract this archive into the project root and allow the included `src` files to replace matching files.
3. Do not replace `.env`, MongoDB data, Google Drive credentials, `node_modules`, or `.next`.
4. Stop the dev server, clear `.next`, then restart.

PowerShell:

```powershell
Compress-Archive -Path src -DestinationPath src-backup-before-compliance-update.zip -Force

# After extracting the update over the project:
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# If package-lock.json exists:
npm ci

# If package-lock.json does not exist:
npm install

npx tsc --noEmit
npm run build
npm run dev
```

## Required end-to-end checks

1. Create a facility. Confirm it is created with no framework applicability.
2. Open an existing facility as Admin. Configure RCO for the current FY and PAT for the upcoming FY, then save.
3. Confirm the matrix displays only three years.
4. Click the newly enabled framework/year cell and confirm its assessment opens.
5. Change a different FY and verify the first FY's settings did not change.
6. Open Data Requests as Consultant. Confirm only Admin-enabled frameworks and their checklist rows are shown, without framework-selection controls.
7. Try submitting a request with a disabled framework using a modified API payload. The API should reject it.
8. Log in as the Client and confirm the portal shows the same facility/year applicability and the matching data request.
9. Regression-test Drive Explorer, Drive sync, uploads, evidence submission, and existing request review flows.

## Verification performed in the preparation environment

- TypeScript/TSX/JavaScript syntax transpilation: 208 files checked, zero syntax diagnostics.
- Financial-year helper checks:
  - 27 Nov 2026 => FY2025-26, FY2026-27, FY2027-28
  - 31 Mar 2027 => FY2025-26, FY2026-27, FY2027-28
  - 1 Apr 2027 => FY2026-27, FY2027-28, FY2028-29

A full application type-check/build and live MongoDB/Google Drive end-to-end test could not be completed here because the uploaded archive does not include installed dependencies, database access, or Drive credentials. Run the commands above locally before pushing/deploying.
