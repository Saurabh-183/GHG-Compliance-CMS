# Carbon Crunch — Compliance Management Platform (MVP v1.0)

> A modern, multi-tenant, role-based web application for industrial energy and carbon regulatory compliance management (RCO/RPO, PAT, CCTS, and CEA Electricity Returns).

Built for **Monday Morning Executive Demonstrations & Stakeholder Handover**.

---

## 1. Project Overview & Architecture

### 1.1 Problem Solved
Industrial compliance teams currently maintain compliance data in distributed Google Drive folders, Excel trackers, DISCOM electricity bills, SAP screenshots, and email chains. This creates operational risk:
- No centralized view of a client's compliance obligations and historical performance.
- No direct link between reported numbers and verified source evidence.
- Repeated data collection across different compliances (RCO vs CCTS).
- Discrepancy reconciliation requires manual back-and-forth email writing.

### 1.2 MVP Principle
The application acts as the **workflow, metadata, and verification layer**. Source documents continue to reside on **Google Drive**, linked directly to reported metric values and monthly line items.

---

## 2. Technology Stack

- **Framework**: Next.js 16 (App Router) with React 19 & TypeScript (Strictly typed, NO `any`)
- **Styling**: Tailwind CSS with custom Dark Slate & Emerald Green design system
- **Database**: MongoDB with Mongoose ODM (singleton cached connection)
- **Authentication & RBAC**: JWT tokens, HTTP-only session cookies, server-side authorization filters, plus an **Instant Role Switcher** for live client meetings.
- **Charts & Visualization**: Recharts for Year-on-Year compliance trajectories
- **Icons**: Lucide React

---

## 3. Project Directory Structure

```
new CMS CC/
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── next.config.ts
├── .env
├── scripts/
│   └── seed.ts                     # Standalone MongoDB seeding script
├── src/
│   ├── types/
│   │   └── index.ts                # Strict TypeScript interfaces (NO any)
│   ├── lib/
│   │   ├── db.ts                   # Cached Mongoose connection singleton
│   │   ├── auth.ts                 # JWT verification, RBAC permissions & data isolation
│   │   ├── utils.ts                # Reconciliation engine formula & email draft generator
│   │   └── seedData.ts             # Complete Trident Group acceptance dataset
│   ├── models/                     # Mongoose Models
│   │   ├── User.ts                 # RBAC users (Admin, Consultant, Reviewer, Client)
│   │   ├── ClientGroup.ts          # Client Group (e.g. Trident Group)
│   │   ├── Facility.ts             # Facilities (e.g. TRIDENT_PAPER, TRIDENT_YARN)
│   │   ├── ComplianceApplicability.ts # Applicability register
│   │   ├── Assessment.ts           # Historical & current assessments + metrics
│   │   ├── DataRequirement.ts      # Checklist data requests
│   │   ├── Dataset.ts              # Monthly reconciliation engine datasets
│   │   ├── Clarification.ts        # Flagged discrepancies & client response
│   │   └── CalendarItem.ts         # Statutory deadlines & CEA schedules
│   ├── context/
│   │   └── AuthContext.tsx         # Client-side session & 1-click role switcher
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.tsx          # Top navbar + Demo role switcher + Reseed button
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx     # Independent workflow & outcome badges
│   │   │   ├── DriveLinkBadge.tsx  # Google Drive file & folder buttons
│   │   │   └── ClarificationEmailModal.tsx # Copyable email generator
│   │   └── compliance/
│   │       ├── ComplianceMatrixTable.tsx # Multi-year matrix with dual statuses
│   │       ├── ReconciliationTable.tsx   # Declared vs Evidence monthly reconciliation
│   │       ├── HistoricalComparisonChart.tsx # Recharts YoY trajectory
│   │       └── ExcelImportModal.tsx      # Standardized CSV/Excel import template
│   └── app/
│       ├── layout.tsx              # Root app shell
│       ├── globals.css             # Design tokens & glassmorphism utilities
│       ├── page.tsx                # Acceptance test walkthrough launchpad
│       ├── login/page.tsx          # Role-based login + 1-click quick logins
│       ├── dashboard/page.tsx      # Consultant workspace & discrepancy alerts
│       ├── clients/
│       │   ├── page.tsx            # Browse client groups
│       │   └── [groupId]/page.tsx  # Group dashboard & facilities
│       ├── facilities/
│       │   └── [facilityId]/page.tsx # Facility compliance matrix across years
│       ├── assessments/
│       │   └── [assessmentId]/
│       │       ├── page.tsx        # Assessment detail & Drive report links
│       │       ├── data/page.tsx   # Current-year data collection checklist
│       │       └── comparison/page.tsx # YoY comparison & trajectory
│       ├── datasets/
│       │   └── [datasetId]/verify/page.tsx # Monthly reconciliation engine
│       ├── approvals/page.tsx      # Reviewer queue & audit sign-off
│       ├── calendar/page.tsx       # Compliance calendar & recurring CEA returns
│       ├── portal/                 # Restricted External Client Portal
│       │   ├── page.tsx            # Client group overview
│       │   ├── facilities/[facilityId]/page.tsx # Client facility read-only view
│       │   ├── requests/page.tsx   # Outstanding requests & Drive upload
│       │   ├── submissions/page.tsx# Clarification response & revised links
│       │   └── history/page.tsx    # Approved historical records archive
│       └── api/                    # Complete REST API (PRD Section 11)
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Capability | Admin | Consultant | Reviewer | Client User (External) |
| :--- | :---: | :---: | :---: | :---: |
| Manage Clients & Facilities | ✅ | ❌ | ❌ | ❌ |
| Configure Compliance Applicability | ✅ | ✅ | ❌ | ❌ |
| Reconcile Monthly Declared vs Evidence | ✅ | ✅ | ❌ | ❌ |
| Raise Discrepancy Clarification & Email Draft | ✅ | ✅ | ❌ | ❌ |
| Submit Verification for Review | ✅ | ✅ | ❌ | ❌ |
| Independent Reviewer Approval & Version Locking | ✅ | ❌ | ✅ | ❌ |
| View Authorized Facilities Only | ✅ | ✅ | ✅ | ✅ |
| Submit Google Drive Links against Requests | ❌ | ✅ | ❌ | ✅ |
| Respond to Clarifications with Revised Evidence | ❌ | ❌ | ❌ | ✅ |
| **Access Unapproved Metrics / Internal Notes** | ✅ | ✅ | ✅ | **❌ Strictly Hidden** |

### Authentication and user accounts

There are no built-in demo login credentials or role-switch buttons. All users authenticate against MongoDB with bcrypt-hashed passwords. An administrator creates accounts from **User Management**. Existing account passwords are not changed by the company/facility provisioning migration. For existing accounts with unknown passwords, use the local `account:reset-password` maintenance command described below.


---

## 5. Comprehensive Documentation & Handover Files
The project includes complete, production-grade documentation across both Markdown and Word formats:
1. **Word Document Report**: [`Carbon_Crunch_Compliance_Platform_v1.0_Report.docx`](file:///c:/Users/saura/Desktop/new%20CMS%20CC/Carbon_Crunch_Compliance_Platform_v1.0_Report.docx) — Formal executive stakeholder handover report with credentials table, RBAC architecture, functional modules, and REST API specification.
2. **Platform Documentation**: [`PLATFORM_DOCUMENTATION.md`](file:///c:/Users/saura/Desktop/new%20CMS%20CC/PLATFORM_DOCUMENTATION.md) — Comprehensive technical manual and implementation guide.
3. **Repository Guide**: [`README.md`](file:///c:/Users/saura/Desktop/new%20CMS%20CC/README.md) — Quickstart setup, directory layout, and acceptance test workflows.

## 6. Getting Started (Local Setup)

### Prerequisites
- Node.js v18+ (tested on v22)
- MongoDB running on `localhost:27017`

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed the Database
Populate all Trident Group demo data, multi-year compliances, reconciliation records, and June 2025 discrepancy:
```bash
```

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

---

## 7. End-to-End Acceptance Test Demo Guide (PRD Section 13)

Follow these exact steps during your Monday morning review:

| Step | Action | Screen to Open | What to Show |
| :---: | :--- | :--- | :--- |
| **1-2** | Inspect Trident Group & Paper Facility | `/clients` → `/clients/TRIDENT` | Show Trident Paper Complex (Pulp & Paper DC) with assigned consultant Priya Sharma and reviewer Dr. Rajesh Nair. |
| **3** | View Compliance Applicability | `/facilities/TRIDENT_PAPER` | Show all 4 registered compliances (RCO, PAT, CCTS, CEA). |
| **4** | Multi-Year Compliance Matrix | `/facilities/TRIDENT_PAPER` | Show RCO FY24-25 (Shortfall / Approved) and FY25-26 (In Progress). Click into RCO FY24-25 assessment. |
| **5** | Historical Performance & Drive Links | `/assessments/[id]` | Show 29.91% target, 25.51% achieved, 5.00 MU shortfall, and working Google Drive report links. |
| **6** | Client Data Request | Switch to **Client** role → `/portal/requests` | Show outstanding FY 2025-26 grid electricity data request. Click **"+ Submit Link"** and paste a Drive URL. Notice status updates to `RECEIVED`. |
| **7** | Month-wise Reconciliation | Switch to **Consultant** → `/datasets/[id]/verify` | Inspect Apr (1,240,000 kWh = MATCHED), May (1,310,000 kWh = MATCHED), and Jun (1,280,000 declared vs 1,265,000 bill = MISMATCH). |
| **8** | Flag Discrepancy & Generate Email | `/datasets/[id]/verify` | Click **"Draft Email"** on June 2025. Show the auto-generated 1-click copy email draft stating the 15,000 kWh variance. |
| **9** | Client Responds with Revised Evidence | Switch to **Client** → `/portal/submissions` | Submit client explanation note and revised Google Drive document link. |
| **10** | Submit for Review | Switch to **Consultant** → `/datasets/[id]/verify` | Click **"Submit Verification for Review"**. Status transitions to `AWAITING_APPROVAL`. |
| **11** | Reviewer Approval Sign-off | Switch to **Reviewer** → `/approvals` | Review audit trail, enter audit notes, and click **"Approve & Lock"**. Version is locked to prevent tampering. |
| **12** | Client Assessment Progress | Switch to **Client** → `/portal` | Show updated progress badge reflecting reviewer approved status. |
| **13** | YoY Comparison & Trajectory | `/assessments/[id]/comparison` | Inspect side-by-side comparison table and Recharts bar chart comparing FY24-25 baseline vs FY25-26 provisional. |

---

## 8. REST API Endpoints (PRD Section 11 Reference)

- `GET /api/client-groups` & `POST /api/client-groups`
- `GET /api/client-groups/:id/facilities`
- `GET /api/facilities` & `GET /api/facilities/:id/compliance-matrix`
- `GET /api/compliance-applicability` & `POST /api/compliance-applicability`
- `GET /api/assessments` & `GET /api/assessments/:id`
- `POST /api/assessments/:id/metrics`
- `GET /api/assessments/:id/requirements`
- `GET /api/assessments/:id/comparison`
- `POST /api/requirements/:id/submissions`
- `GET /api/datasets` & `GET /api/datasets/:id`
- `POST /api/datasets/:id/evidence`
- `POST /api/datasets/:id/verifications`
- `POST /api/verifications/:id/submit-review`
- `POST /api/verifications/:id/approve`
- `POST /api/verifications/:id/reject`
- `GET /api/clarifications` & `POST /api/clarifications` & `PATCH /api/clarifications/:id`
- `GET /api/calendar` & `POST /api/calendar` & `PATCH /api/calendar`
- `POST /api/reports`
- `POST /api/regulatory-submissions`
- `GET /api/portal/dashboard`

---

## 9. License & Confidentiality
Confidential and Proprietary. Developed for Carbon Crunch Compliance Systems.


## Authentication and account administration

All accounts authenticate against MongoDB using bcrypt password hashes. The browser session is an HTTP-only `cc_auth_token` cookie. There are no demo role-switch logins or development administrator bypasses. Set `JWT_SECRET` to a unique random value of at least 32 characters.

### Bootstrap the first administrator

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the private `.env` file (password must be at least 12 characters), then run `npm run admin:create`. This command refuses to overwrite an existing account. After the first administrator signs in, use **User Management** in the navigation to create administrator, consultant and client accounts.

Consultant accounts must be assigned one or more active facility IDs. Client accounts are automatically assigned all active facilities in their selected company group. Newly created accounts are marked to change their temporary password; the current password-change API is available at `POST /api/auth/change-password` and requires `currentPassword` and `newPassword` (minimum 12 characters).

Do not enable `ENABLE_DATABASE_SEED` on production. Do not commit `.env`, database backups, or real credentials.


### Reset an existing administrator or consultant password

For an existing account whose password is unknown, set `TARGET_EMAIL` and `NEW_PASSWORD` in the private `.env` file, then run `npm run account:reset-password`. This is a local database maintenance command; keep the new password private. It marks the account to change the temporary password on next login. Do not use it for bulk client password resets.


### Require existing client accounts to change their current password

The 42 company accounts have already been provisioned. To require those client users (including the existing Trident client) to change their current password at next login without changing any password hashes, run `npm run clients:require-password-change`. This sets only `mustChangePassword`.
