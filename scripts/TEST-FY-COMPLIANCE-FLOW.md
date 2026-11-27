# FY Compliance workflow API smoke test

This is a live API smoke test for the Admin -> facility/FY applicability -> Consultant RCO draft request path. It uses an existing facility and real JWTs. It does not create organizations or facilities.

## Safety

Run only against local development or a staging database. The test upserts RCO applicability for the selected facility/FY and creates one **DRAFT** data request. It does not send a client notification. The RCO applicability is intentionally retained; remove the generated draft after inspection.

## Prerequisites

1. Start the app and connect it to a disposable/staging database: `npm run dev`.
2. Have an existing facility.
3. Have a Consultant account authorized for that facility. If the facility has `assignedConsultantId`, it must match the Consultant JWT's user ID.
4. Obtain valid Admin and Consultant JWTs by signing into the application and reading the `cc_auth_token` cookie in browser DevTools. Do not commit tokens or put them in source control.

## PowerShell

```powershell
$env:BASE_URL = 'http://localhost:3001'
$env:TEST_FACILITY_ID = 'YOUR_EXISTING_FACILITY_ID'
$env:TEST_FINANCIAL_YEAR = 'FY2026-27'
$env:ADMIN_TOKEN = 'PASTE_ADMIN_JWT'
$env:CONSULTANT_TOKEN = 'PASTE_CONSULTANT_JWT'
# Optional: use the Consultant MongoDB user ID if you want to assign the applicability to them.
$env:TEST_CONSULTANT_USER_ID = 'CONSULTANT_MONGODB_USER_ID'
node scripts/test-fy-compliance-flow.mjs
```

The script exits with code 0 only when all API checks pass. It reports the first failing step and response.

## Manual frontend verification after API test

1. Sign in as Admin.
2. Open the organization and the selected facility.
3. Open its compliance/financial-year settings.
4. Select the same FY and confirm RCO is enabled and remains enabled after refresh.
5. Select another FY and confirm the settings are independent; do not enable CCTS for this test FY.
6. Sign out and sign in as the Consultant assigned to the facility.
7. Open Data Requests, select the same facility and FY, and confirm RCO is available.
8. Create an RCO request as a **draft** first. Confirm it appears in the request list after refresh.
9. Confirm frameworks not enabled for that facility/FY are unavailable or rejected by the API.
10. Only after the draft flow is verified, send a real request and test the Client submission, evidence upload, Consultant review and existing approval flow.

## What this test does not prove

It does not automate browser UI interactions, Client submission, Google Drive upload, approval, or production deployment. Those must be manually verified using the checklist above. It also does not prove that every unrelated legacy workflow is regression-free.
