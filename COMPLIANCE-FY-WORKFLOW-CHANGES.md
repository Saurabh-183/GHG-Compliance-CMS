# Facility / financial-year compliance workflow changes

## Intended workflow

1. Admin creates an organization and registers a facility. Facility creation no longer requires selecting a global list of compliance frameworks.
2. In the Admin > Facility tab, the **Facility compliance by financial year** panel lists existing facilities.
3. Admin selects a facility and financial year (for example `FY2026-27`), selects the applicable frameworks (for example RCO), and saves.
4. Each framework/year selection is persisted as a `ComplianceApplicability` record. `Facility.enabledFrameworks` is maintained as the union of frameworks that are applicable in at least one financial year. This is the facility-wide allow-list; the applicability record is the year-specific source of truth.
5. Consultant selects the facility and reporting year in the existing data-request workflow. The Linked frameworks control only displays frameworks enabled for that exact facility/year.
6. The server independently validates every requested framework against both the year-specific applicability record and the facility allow-list. A consultant cannot bypass the UI and request an unconfigured framework through the API.

## Files changed

- `src/app/admin/users/page.tsx`
  - Facility creation no longer requires a facility-wide framework selection.
  - Adds the financial-year compliance configuration panel under the Facility tab.
- `src/components/admin/FacilityComplianceYearSettings.tsx` **(new)**
  - Admin UI to choose facility, financial year, and applicable frameworks; saves all framework selections for that facility/year.
- `src/app/api/compliance-applicability/route.ts`
  - Only Admin can create/update applicability configuration.
  - Validates facility and framework and synchronizes `Facility.enabledFrameworks` to the union of active year-specific frameworks.
- `src/app/api/facilities/route.ts`
  - Allows facility creation before any compliance/year has been configured; new facilities start with an empty framework allow-list.
- `src/app/api/facilities/[id]/route.ts`
  - Prevents generic facility edits from changing the framework allow-list and unintentionally affecting every financial year.
- `src/app/api/facilities/[id]/compliance-matrix/route.ts`
  - Treats an empty legacy allow-list as unspecified; actual year-specific applicability records still determine matrix cells.
- `src/components/requests/FacilityDataRequestPanel.tsx`
  - Loads applicable frameworks for the selected facility and reporting year and only lets consultants link those frameworks.
- `src/app/api/requirements/route.ts`
  - Server-side validation blocks requests for frameworks not enabled for the target facility and financial year.
- `src/lib/complianceMatrixData.ts`
  - Supports a rolling range of financial years instead of only the three hard-coded years.
- `src/app/api/assessments/route.ts`
  - Accepts the supported `FY2026-27` / `2026-27` period representations when validating assessment creation.

## Data compatibility

No collection is renamed or removed. Existing `ComplianceApplicability` documents remain in place. Existing facilities retain their stored `enabledFrameworks`; the new Admin save operation recalculates that field from all active applicability records across years. Do not manually delete existing applicability records.

## Verification status

The source files were reviewed and patched. A full TypeScript/build verification could not be completed in this environment because the archive does not include installed dependencies and `npm ci` timed out before installing them. Run the checks below in your normal development environment before deploying:

```powershell
npm ci
npx tsc --noEmit
npm run build
```

Then test the workflow with an Admin, Consultant, and Client account against a non-production database.
