# Compliance matrix and historical coverage implementation changelog

## Updated files

- `data/compliance/report-coverage-master.json` — authoritative 117-row report coverage list, PAT/CCTS FY2025-26 rules, RCO/RPO year mapping, reviewed aliases, and explicit provisioning metadata for missing client/facility rows.
- `scripts/sync-report-coverage-master.mjs` — dry-run/apply migration. Provisions missing parent groups/facilities, aligns confirmed alias display names while preserving stable IDs, applies RCO and RPO independently, and scopes reconciliation to the four confirmed frameworks and the three matrix years (the two source years plus FY2026-27, which is explicitly disabled because no source coverage exists). Writes a pre-migration JSON backup and leaves unlisted facilities and unrelated records untouched.
- `src/lib/complianceMatrixData.ts` — removes generated default applicability and synthetic assessment data; matrix is built only from actual records and now includes independent RCO and RPO rows.
- `src/components/compliance/ComplianceMatrixTable.tsx` — displays RCO and RPO as separate framework rows while retaining the existing matrix styling and navigation behaviour.
- `src/types/index.ts` and compliance Mongoose models — add RPO as a supported framework type so its applicability and assessment records can be persisted independently.
- `src/app/api/facilities/[id]/compliance-matrix/route.ts` — read-only matrix endpoint; no database writes on GET.
- `src/app/api/assessments/route.ts` — assessment listing filters to applicable facility/framework/year records; assessment creation requires explicit applicability and prevents duplicates.
- `src/app/api/assessments/[id]/route.ts` — assessment reads and updates require the exact applicability to remain enabled; no synthetic assessment fallback.
- `src/app/api/assessments/[id]/regulatory/route.ts` — lazy assessment creation and access to existing assessments require explicit applicable records.
- `src/app/api/compliance-applicability/route.ts` — reads/writes explicit applicability records through the existing API.
- `package.json` — adds `compliance:coverage:dry-run` and `compliance:coverage:apply` commands.
- `docs/COMPLIANCE-COVERAGE-MAPPING.md` — source interpretation, confirmed alias mapping, counts, and safe migration steps.

## Existing functionality preservation

No existing assessment, metric, evidence, calculation workbook, regulatory submission, approval, user, Drive record, client group, or facility is deleted by the coverage migration. Existing stable facility IDs are retained for confirmed aliases and Jodhani Unit 1. The migration changes only the applicable flag/outcome for RCO/RPO/PAT/CCTS in FY2024-25, FY2025-26, and FY2026-27 for facilities in the report master, the facility's enabled-framework list to expose the RPO matrix row, and the display names explicitly confirmed by the user. Unlisted facilities and other frameworks/years are untouched.

## Verification status

- Migration script syntax: checked with `node --check`.
- Static reconciliation against the included MongoDB backup: 117 source rows resolve as 107 existing facility records plus 10 planned new facilities; no ambiguous mappings.
- Full MongoDB dry-run/apply: not executed because the ZIP does not include private database credentials.
- Full Next.js production build: must be run in the user's environment after dependency installation.

## RPO template note

The matrix and persistence layer support RPO independently. No RPO statutory summary-sheet template was present in the supplied project, so the RCO template has not been misused as an RPO form. A dedicated RPO template can be added when its authoritative form/workbook is supplied.

## Files changed in the RCO/RPO separation revision

### Frontend
- `src/components/compliance/ComplianceMatrixTable.tsx` — separate RCO and RPO labels/rows; existing styling and link behavior retained.
- `src/app/assessments/[assessmentId]/page.tsx` — makes the RPO assessment panel route visible without inventing an RPO statutory form.

### Types and persistence
- `src/types/index.ts`
- `src/models/Assessment.ts`
- `src/models/ComplianceApplicability.ts`
- `src/models/Facility.ts`
- `src/models/ClientGroup.ts`
- `src/models/CalendarItem.ts`
- `src/models/DataRequirement.ts`
- `src/models/RegulatorySubmission.ts`
- `src/lib/regulatory/regulatoryTemplates.ts`

### API validation and framework propagation
- `src/app/api/admin/users/route.ts`
- `src/app/api/assessments/[id]/regulatory/route.ts`
- `src/app/api/client-groups/[id]/route.ts`
- `src/app/api/client-groups/route.ts`
- `src/app/api/facilities/[id]/data-checklist/send/route.ts`
- `src/app/api/facilities/[id]/route.ts`
- `src/app/api/facilities/route.ts`
- `src/app/api/portal/dashboard/route.ts`
- `src/app/api/requirements/route.ts`

### Coverage master and migration
- `data/compliance/report-coverage-master.json` — records RCO and RPO independently.
- `scripts/sync-report-coverage-master.mjs` — backup-first, collision-preflighted, scoped migration; leaves unlisted facilities untouched and disables stale FY2026-27 rows for the four matrix frameworks.
- `scripts/verify-report-coverage-master.mjs` — offline validation of 117 names, 209 coverage rows, independent RCO/RPO counts, and three Jodhani units.
- `package.json` — adds `compliance:coverage:verify`.
- `docs/COMPLIANCE-COVERAGE-MAPPING.md`
- `docs/IMPLEMENTATION-CHANGELOG-COMPLIANCE-MATRIX.md`
