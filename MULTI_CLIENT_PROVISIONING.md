
# Multi-Client Provisioning

## Company and Facility Mapping

The authoritative mapping is stored in:

company-facility-mapping.json

It contains:
- 42 company/client groups
- 109 facility/unit rows

Each company receives one CLIENT login.

## Login Convention

Email:
companyname@clients.com

Initial password:
123456

Password is stored using bcrypt hashing.

## Provisioning

First configure the MongoDB connection string.

Run:

npm install

npm run clients:dry-run

Review the proposed company and facility assignments.

After verifying the output:

npm run clients:provision

## Password Reset

To intentionally reset all mapped client account passwords:

npm run clients:reset-passwords

## Custom Initial Password

PowerShell:

$env:CLIENT_INITIAL_PASSWORD = 'YourTemporaryPassword'

npm run clients:provision

## Important

- Existing account passwords are preserved during normal provisioning.
- Facility access is derived from clientGroupId.
- Do not run provisioning against production without reviewing a database backup and dry-run results.
- Audit all data submission and evidence APIs for server-side organisation isolation before production.
