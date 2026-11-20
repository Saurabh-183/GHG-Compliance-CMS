# Regulatory summary-sheet workflow

## Roles

- **Consultant/Admin:** select the assessment's applicable regulatory template and use `Request data from client` to create a `REQUESTED` submission.
- **Client:** sees requested forms in `/portal/regulatory`, enters values, attaches evidence links, saves a draft, and submits. The client cannot select a different template from the one requested.
- **Consultant:** views submitted values read-only, starts review, verifies/rejects fields, and returns the submission for correction when needed.
- **Client:** edits a returned submission and resubmits it.
- **Admin:** performs final approval after consultant report verification.

## Status transitions

`NOT_REQUESTED -> REQUESTED -> DRAFT -> SUBMITTED -> UNDER_REVIEW -> VERIFIED -> APPROVED`

Correction path: `SUBMITTED/UNDER_REVIEW -> RETURNED -> DRAFT -> SUBMITTED`.

## API permissions

- `GET /api/assessments/:id/regulatory`: authorized facility users can view.
- `PUT /api/assessments/:id/regulatory`: CLIENT only, and only after a request exists in REQUESTED/DRAFT/RETURNED state.
- `POST /api/assessments/:id/regulatory`: CLIENT only.
- `PATCH /api/assessments/:id/regulatory`: ADMIN/CONSULTANT only. `REQUEST_DATA` creates a request; review actions verify, reject, return, or verify the report; `APPROVE` is ADMIN only.
- `GET /api/regulatory-submissions`: lists submissions visible to the authenticated user's authorized facilities.

## Client page

The client can find requested regulatory forms at `/portal/regulatory`. Opening a request routes to its assessment page, where the requested summary sheet is rendered for client entry.

## Calculation note

The template fields are based on the supplied summary sheets. Do not treat calculated values as regulator-approved until they have been reconciled with the authoritative calculation workbooks and current notified methodologies. The PDFs are summary sheets and do not contain every calculation input or factor.
