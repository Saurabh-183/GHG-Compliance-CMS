# Historical compliance coverage mapping

## Source of truth

`data/compliance/report-coverage-master.json` is transcribed from the supplied **Report Current Status - Copy of Status.pdf**. The report-status list is authoritative for historical report coverage. The separate company/facility directory is an older client hierarchy reference and must not cause valid report rows to be dropped.

Confirmed rules:

- RCO: independent applicability records for FY2024-25 and FY2025-26, exactly matching the RCO source checkboxes.
- RPO: independent applicability records for FY2024-25 and FY2025-26, exactly matching the RPO source checkboxes. RPO is a separate matrix row and is never inferred from RCO.
- PAT: FY2025-26 only. No PAT report is represented before FY2025-26.
- CCTS: FY2025-26 only. No CCTS report is represented before FY2025-26.
- FY2026-27: no historical coverage is inferred; cells remain Not Applicable until explicitly configured.
- Workflow status and regulatory outcome are not inferred from the coverage list. Existing workflow status is preserved. Existing applicable outcomes are preserved; newly enabled rows start `PENDING_DETERMINATION`.

## Reconciliation decisions confirmed by the user

- `Hero MotoCorp - Jaipur` maps to the existing `Hero MotoCorp - Rajasthan` facility record. The existing stable `facilityId` and MongoDB `_id` are retained; the display name is aligned to the report list.
- `SPNG Group - Iron and Steel` maps to the existing `Galvalia Ispat` facility record. The existing stable `facilityId` and MongoDB `_id` are retained; the display name is aligned to the report list.
- Jodhani Paper has three facilities. The existing `Jodhani Paper` record becomes `Jodhani Paper Unit 1` while retaining its stable IDs; Units 2 and 3 are created as separate facilities under the existing `Jodhani Paper` client group.
- The report-status list, not the older client directory, determines which report-list facility rows must be present. Missing rows are provisioned under parent groups specified in the master. New group contact/location metadata is explicitly marked as not provided rather than invented.

## Expected reconciliation against the ZIP's MongoDB backup

- Source report rows: 117
- Rows matched to existing facilities (including confirmed aliases): 107
- New facilities to provision: 10 (Adhunik Metallicks, R C J C, Revival Papers Pvt Ltd, four Arvind Limited units, Jodhani Paper Units 2 and 3, and Indian Acrylics)
- New client groups to provision: 5 (Adhunik Metallicks, R C J C, Revival Papers Pvt Ltd, Arvind Limited, Indian Acrylics)
- Existing facilities absent from the report list: 2 (`Shree Renuka Sugar Mills Limited` and `Sahakarmaharshi Bhausaheb Thorat Sahakari Sakhar Karkhana Ltd.`). They remain in the client directory and are deliberately left untouched by this migration because the report master does not establish their coverage.

The migration must print these counts and stop if the source cannot be reconciled exactly. It does not delete client groups, facilities, users, assessments, evidence, metrics, calculation workbooks, regulatory submissions, or approvals.

## Apply safely

1. Back up MongoDB using your normal backup process.
2. Keep the production `.env` private and verify `MONGODB_URI` / `MONGO_URL` points to the intended database.
3. Run `npm run compliance:coverage:dry-run`.
4. Confirm the output shows 117 resolved report rows, 10 facilities to create, 5 client groups to create, 0 unresolved/ambiguous rows, and 2 existing facilities absent from the report master.
5. Run `npm run compliance:coverage:apply` only after confirming the database and dry-run report.
6. Run `npm run build` and test consultant navigation, each affected facility matrix, assessment opening, client submissions, evidence, calculation workbooks, approvals, and report lists.

The script is designed to be idempotent. Before its first write it creates a JSON backup of matched facility and applicability records under `backups/compliance-coverage/`. It reconciles RCO, RPO, PAT, and CCTS for FY2024-25 and FY2025-26 on facilities in the report master, and explicitly turns off stale FY2026-27 applicability rows for those same frameworks because the supplied master contains no FY2026-27 coverage. It does not touch other frameworks, other years, unlisted facilities, assessments, or their workflow records. Existing matched facility IDs and parent relationships are retained; new rows use explicit `clientGroupName` and `facilityId` metadata in the master.

## Matrix and assessment safeguards

- Matrix GET is read-only and never creates applicability or assessments.
- A matrix cell is enabled only by an explicit applicable record for that exact facility/framework/year.
- Not Applicable cells render as non-links.
- Assessment list GET filters out assessments without a matching applicable record.
- Assessment POST rejects creation unless the exact facility/framework/year is applicable and rejects duplicates.
- Regulatory assessment lazy-creation also checks explicit applicability before creating anything.

## RPO assessment-template boundary

RPO is now a first-class applicability/assessment framework and appears as its own matrix row. The supplied codebase contains an RCO Form A template but no separate RPO summary-sheet template. The implementation does not reuse the RCO form for RPO because that would collect the wrong regulatory data. An RPO assessment can be opened and its general assessment workflow remains available; the regulatory panel will report that no RPO template is configured until the correct RPO form is supplied.
