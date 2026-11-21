# Authentication and authorization update

## Implemented

- Replaced role/demo login with MongoDB email + password authentication using bcrypt.
- Removed the development administrator bypass and demo role-header authentication.
- Removed frontend hardcoded users, role switching, demo login buttons and the destructive seed UI/API.
- JWTs are signature-verified in `src/proxy.ts`, use the configured `JWT_SECRET`, and expire after 30 minutes. The token is stored only in an HttpOnly cookie.
- Added account status handling (`ACTIVE`, `DISABLED`, `LOCKED`).
- Added mandatory password-change flow for accounts flagged with `mustChangePassword`.
- Added administrator user management APIs and page for creating accounts, disabling/enabling accounts, and assigning consultant facilities.
- Client accounts receive active facilities from their selected company group.
- Consultant accounts are restricted to their assigned facility IDs. Existing consultant facility assignments are derived from `assignedConsultantId` / `assignedReviewerId` when the user record has no explicit facility list.
- Added resource-level facility checks to the main facility, dataset, assessment, reporting, calendar, Drive, clarification, notification, and verification routes.
- Removed demo-success responses from several write routes so a database failure cannot be reported as a successful write.
- Preserved the company/facility migration data and existing password hashes. The migration now requires a 12-character minimum initial password for future new client accounts and flags newly inserted accounts for a first-login password change.

## New files

- `src/app/api/auth/change-password/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/admin/users/page.tsx`
- `src/app/change-password/page.tsx`
- `scripts/create-admin.mjs`
- `scripts/set-user-password.mjs`
- `scripts/require-client-password-change.mjs`

## Removed demo-only files

- `src/app/api/seed/route.ts`
- `src/lib/seedData.ts`
- `scripts/seed.ts`

## Important setup

- Set a unique `JWT_SECRET` of at least 32 characters in `.env`.
- Existing accounts whose passwords are unknown can be reset with `TARGET_EMAIL` and `NEW_PASSWORD`, then `npm run account:reset-password`.
- If no administrator exists, set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and run `npm run admin:create`.
- To require all already-provisioned client accounts to change their current password without changing their hashes, set `npm run clients:require-password-change`.
- Consultants need at least one assigned facility. Existing assignments are derived from facility records; administrators can manage explicit assignments in **User Management**.
- Newly created accounts must change their temporary password at first login.

## Validation performed in this workspace

- Parsed all 129 TypeScript/TSX source files with the TypeScript parser: no syntax diagnostics.
- `node --check` passed for the new `.mjs` scripts and the company/facility migration script.
- `package.json` parsed successfully.
- Python syntax compilation passed for the updated report-generation script.

## Validation limitation

A full dependency installation and `next build` could not be completed in this workspace: `npm ci` timed out and offline installation failed because required package tarballs were not cached. The live MongoDB database and browser flows were not available here. Run `npm ci` and `npm run build` in the project environment, then execute the login, password-change, user-management and cross-facility authorization tests before production deployment.
