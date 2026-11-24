# Statutory regulatory workflow changes

## Scope
This package preserves the existing application and adds notification events for the RCO, PAT and CCTS regulatory summary-sheet workflow. The existing report templates and Excel export were already present and were retained. CEA electricity returns were not added to this workflow.

## Changed source files
- `src/models/Notification.ts` — adds notification types for regulatory request, submission, approval and return events.
- `src/app/api/assessments/[id]/regulatory/route.ts` — sends client/consultant notifications at request, submit, return and approval transitions; permits an authorized consultant to perform final approval after verification.
- `src/components/regulatory/RegulatoryMetricsPanel.tsx` — exposes final approval to consultants as well as admins.
- `src/components/common/NotificationBell.tsx` — displays appropriate icons for the new regulatory notification types.

## Existing functionality retained
- RCO, PAT and CCTS report-specific templates in `src/lib/regulatory/regulatoryTemplates.ts`.
- CCTS textile Fibre (SG2), Processing (SG4), Composite (SG1) and Spinning (SG3) variants.
- Excel export in `RegulatoryMetricsPanel.tsx`.
- Client submission, field review, report verification, approval/return statuses and audit trail.
- Notification click-through to the relevant assessment URL.

## Reference PDFs
The supplied RCO, PAT and CCTS PDFs are included under `docs/reference-summary-sheets/` for traceability.

## Validation note
The ZIP was inspected and the targeted source changes were applied. A full Next.js production build and live end-to-end test were not run in this environment because the project dependencies and the user's MongoDB/authentication environment are not included. After extracting, run `npm install` and `npm run build`, then test the workflow using consultant and client accounts connected to the staging database.
