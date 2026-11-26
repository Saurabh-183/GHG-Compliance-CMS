# Compliance matrix and historical coverage implementation changelog

## Updated files

- `data/compliance/report-coverage-master.json` — authoritative 117-row report coverage list, PAT/CCTS FY2025-26 rules, RCO/RPO year mapping, reviewed aliases, and explicit provisioning metadata for missing client/facility rows.
- `scripts/sync-report-coverage-master.mjs` — idempotent dry-run/apply migration. Provisions missing parent groups/facilities, aligns confirmed alias display names while preserving stable IDs, applies exact applicability rows, and disables historical coverage for existing facilities absent from the report list without deleting those facilities.
- `src/lib/complianceMatrixData.ts` — removes generated default applicability and synthetic assessment data; matrix is built only from actual records.
- `src/app/api/facilities/[id]/compliance-matrix/route.ts` — read-only matrix endpoint; no database writes on GET.
- `src/app/api/assessments/route.ts` — assessment listing filters to applicable facility/framework/year records; assessment creation requires explicit applicability and prevents duplicates.
- `src/app/api/assessments/[id]/route.ts` — assessment reads and updates require the exact applicability to remain enabled; no synthetic assessment fallback.
- `src/app/api/assessments/[id]/regulatory/route.ts` — lazy assessment creation and access to existing assessments require explicit applicable records.
- `src/app/api/compliance-applicability/route.ts` — reads/writes explicit applicability records through the existing API.
- `package.json` — adds `compliance:coverage:dry-run` and `compliance:coverage:apply` commands.
- `docs/COMPLIANCE-COVERAGE-MAPPING.md` — source interpretation, confirmed alias mapping, counts, and safe migration steps.

## Existing functionality preservation

No existing assessment, metric, evidence, calculation workbook, regulatory submission, approval, user, Drive record, client group, or facility is deleted by the coverage migration. Existing stable facility IDs are retained for confirmed aliases and Jodhani Unit 1. The migration changes only the applicable flag/outcome for historical coverage rows and the display names explicitly confirmed by the user.

## Verification status

- Migration script syntax: checked with `node --check`.
- Static reconciliation against the included MongoDB backup: 117 source rows resolve as 107 existing facility records plus 10 planned new facilities; no ambiguous mappings.
- Full MongoDB dry-run/apply: not executed because the ZIP does not include private database credentials.
- Full Next.js production build: must be run in the user's environment after dependency installation.
