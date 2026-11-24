# Carbon Crunch — Compliance Management Platform (MVP v1.0)
## Executive Handover Document, System Manual & Architecture Guide

---

## 1. Executive Summary & Access Credentials

The **Carbon Crunch Compliance Management Platform** is a multi-tenant, role-based enterprise web application designed to centralize and automate statutory energy and carbon regulatory compliance for designated industrial consumers across India. 

The platform manages compliance obligations under:
1. **RCO / RPO** (Renewable Consumption Obligations — PSERC)
2. **PAT** (Perform, Achieve and Trade Scheme — Bureau of Energy Efficiency, BEE)
3. **CCTS** (Carbon Credit Trading Scheme — Ministry of Power & Bureau of Energy Efficiency)
4. **CEA Returns** (Central Electricity Authority Monthly & Annual Generation/Consumption Returns)

---

### 1.1 Authentication and Role Matrix

The application does not ship with hardcoded demo credentials, role switching, or an automatic development administrator. All roles authenticate against MongoDB using bcrypt password hashes and a signed JWT in an HTTP-only cookie.

| Role | Account provisioning | Access scope |
| :--- | :--- | :--- |
| **ADMIN** | Created by the first-admin bootstrap command or another administrator | Platform-wide administration and user management |
| **CONSULTANT** | Created by an administrator | Only facilities assigned to the account |
| **CLIENT** | Created by an administrator and linked to a company group | Only facilities belonging to that company and explicitly authorized for the account |

New accounts created in User Management must change their temporary password at first login. Existing accounts can be reset using the local password-maintenance script.

---

## 2. Key Architectural Features

### 2.1 Strict Role-Based Access Control (RBAC) & Next.js Middleware
- **Cookie Security**: Authentication relies on signed JWTs stored in `cc_auth_token` with `HttpOnly`, `SameSite=Lax`, and `Path=/`.
- **Next.js Proxy** (`src/proxy.ts`):
  - Unauthenticated visitors attempting to access protected screens are redirected to `/login`.
  - External `CLIENT` users attempting to access internal consultant/reviewer routes (`/dashboard`, `/approvals`, `/facilities/...`, `/datasets/...`, `/clients`, `/calendar`) are blocked and redirected to `/portal`.
  - Internal staff attempting to navigate into the Client Portal are redirected to `/dashboard`.
- **Isolated User Interface**: The top navigation bar dynamically adapts to the authenticated role:
  - Role-switching demo controls are removed.
  - User Management is available only to administrators.
  - Client navigation is completely isolated from internal consultant tools.

### 2.2 Cross-Role Notification Engine (Sender & Receiver Triggers)
A notification system alerts users when actions occur across organizational boundaries:
- **Clarification Raised**: When a Consultant flags a reconciliation mismatch, the Client receives an immediate notification in their portal.
- **Evidence Submitted**: When a Client uploads Google Drive evidence, the Consultant receives a notification with a direct link to the reconciliation engine.
- **Review Requested**: When a Consultant finishes a monthly dataset and submits for approval, the Reviewer receives a notification in their Reviewer Queue.
- **Dataset Approved / Locked**: When a Reviewer approves a dataset, both the Consultant and Client receive confirmation that the filing has been audited and locked.
- **Deadline Extended**: When a statutory deadline is extended, an alert is broadcast to all affected stakeholders.
- **Interactive Notification Bell**: Integrated in the top header with an unread badge counter and 1-click navigation to the relevant record.

### 2.3 Evidence Document Preview Engine
Per the PRD specification, Carbon Crunch does not store raw files on internal disks; source files reside securely in client **Google Drive** repositories. 
- To provide presentation-ready auditability and prevent external 404 errors from mock demo URLs, clicking any **"PSPCL Bill"** badge launches the in-platform **Evidence Document Modal**.
- Displays an authenticated representation of Punjab State Power Corporation Limited (PSPCL) HT electricity bills:
  - Consumer ID: `PSPCL-BARNALA-66KV-0042` (Trident Paper Limited)
  - Meter Number: `L&T-EM-99214` (12,000 kVA Contract Demand @ 66 kV)
  - Detailed metered consumption (e.g. June 2025: 1,265,000 kWh net recorded energy)
  - Discrepancy analysis highlighting the +15,000 kWh variance against client-declared logs.
  - Direct option to open the external Google Drive URL.

### 2.4 Dark Mode & Light Mode Dual-Theme Architecture
- **Dedicated Light Mode**: Features a crisp white navbar (`bg-white/95 border-b border-slate-200`) with dark slate typography (`text-slate-900`, `text-slate-700`), a clean `bg-slate-100` status sub-bar, high-contrast table headers (`thead` in `bg-slate-100`), vibrant red discrepancy action cards, and readable badges with emerald and rose accents.
- **Untouched Dark Mode**: Completely preserves the dark navy slate (`#020617`, `#0f172a`) aesthetic with glowing emerald highlights, subtle borders, and dark glassmorphic panels without any visual regressions.
- **Tailwind Class Variant**: Driven by `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css` ensuring explicit separation between light and dark tokens.
- **Theme Toggle**: Sun/Moon toggle button conveniently available in the top action bar and on the login screen. Persists user preference in `localStorage`.

### 2.5 Login Password Visibility Toggle
- Interactive eye icon button on the login screen allowing users to easily toggle between masked (`••••••••`) and unmasked plaintext password input.

### 2.6 Animated Rotating Carbon Crunch Center Loader
- Custom CSS keyframe animation (`@keyframes cc-spin-clean`) featuring the **Carbon Crunch shield/leaf logo rotating in the center**.
- Rendered during dynamic API fetching across all platform screens.

### 2.7 Source Code Management & `.gitignore`
- Standardized `.gitignore` in project root covering Next.js build cache (`.next/`), dependencies (`node_modules/`), local secrets (`.env*.local`), TypeScript declarations, and debug logs.

---

## 3. Core Functional Modules (PRD Implementation)

### Module 1: Multi-Facility Compliance Matrices & YoY Historical Trajectory
- **Conglomerate Hierarchy**: Industrial conglomerates (e.g. Trident Group) grouped with individual designated consumer facilities:
  - `TRIDENT_PAPER` (Pulp & Paper, Barnala, Punjab — PAT DC, RCO, CCTS, CEA)
  - `TRIDENT_YARN` (Textile Spinning, Dhaula, Punjab)
  - `TRIDENT_TEXTILES` (Home Textiles, Budhni, Madhya Pradesh)
- **Multi-Year Compliance Register**:
  - Displays multi-year compliance matrices (FY23-24, FY24-25, FY25-26).
  - Status tracking: `COMPLIANT`, `SHORTFALL`, `IN_PROGRESS`, `UNDER_REVIEW`, `OVERDUE`.
  - Shortfall and surplus quantification (e.g. 5.0 MU RCO shortfall in FY24-25).
  - Side-by-side Year-over-Year (YoY) trajectory comparison tables.

### Module 2: Data Collection & Drive Evidence Association
- Consultant creates data collection checklists for designated reporting periods.
- External industrial clients log in to the Client Portal to inspect outstanding requirements.
- Client pastes Google Drive links to supporting evidence (energy logs, DISCOM bills, meter calibration certificates).
- Submission status automatically updates from `NOT_STARTED` to `RECEIVED` / `UNDER_REVIEW`.

### Module 3: Monthly Verification & Reconciliation Engine
- **Month-by-Month Auditing**: Reconciles client-declared values (Excel logs) against evidence values (official DISCOM utility bills).
- **Tolerance & Discrepancy Detection**:
  - Configurable tolerance percentage (0.5% default, 0% strict).
  - Flags mismatches automatically with colored badges and variance calculations.
  - **Flagged Demonstration Case (June 2025)**:
    - Declared Value: `1,280,000 kWh`
    - DISCOM Bill Value: `1,265,000 kWh`
    - Net Variance: `+15,000 kWh (+1.186%)` → Automatically flagged as `MISMATCH`.
- **Inline Editing & Excel Import**:
  - Consultants can edit cells inline or upload Excel spreadsheets to bulk-import monthly consumption.

### Module 4: Discrepancy Query & Clarification Lifecycle
- **1-Click Clarification Email Generator**: Generates an official discrepancy inquiry email addressed to client management (Vikram Singh), pre-populated with consumer account numbers, meter numbers, declared vs billed units, and evidence links.
- **Client Portal Resolution**: Client receives notification, reviews flagged variance, and submits written explanations and revised Drive evidence.

### Module 5: Independent Reviewer Queue & Audit Sign-Off
- Independent auditor queue (`/approvals`) for Chief Reviewer Dr. Rajesh Nair.
- Reviewer inspects consultant reconciliation logs, audit trail entries, and tolerance results.
- **One-Click Approval & Lock**: Sets `verificationStatus = 'APPROVED'`, stamps reviewer credentials and timestamp, locks the dataset version against unauthorized tampering.
- **Rejection & Return**: Allows returning dataset to consultant with required audit notes.

### Module 6: Statutory Compliance Calendar
- Tracks regulatory submission deadlines, client cut-off dates, and recurring CEA monthly returns.
- **Deadline Extension Tracking**:
  - Captures official circular reference (e.g., `BEE/PAT-Ext/2025/19`), regulatory justification, and date changes.
  - Maintains revision audit history with revision counter badges (`Extended (1x)`).

---

## 4. Technical Specifications & REST APIs

### 4.1 Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS + Tailwind utility tokens, Lucide React icons.
- **Notifications**: `react-toastify` with custom lightweight minimalistic CSS styling.
- **Backend**: Next.js API Route Handlers, Node.js runtime.
- **Database**: MongoDB with Mongoose ODM (strictly typed schemas, compound indexes).
- **Security**: JWT (`jsonwebtoken`), `bcryptjs`, Next.js Edge Middleware.

### 4.2 REST API Endpoints
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticates user credentials, sets `cc_auth_token` cookie. |
| `/api/auth/logout` | `POST` | Authenticated | Clears `cc_auth_token` cookie. |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated user and role. |
| `/api/admin/users` | `GET`, `POST` | Admin | Lists and provisions application accounts. |
| `/api/client-groups` | `GET` | Internal | Fetches registered industrial conglomerates and facilities. |
| `/api/facilities/[id]/compliance-matrix` | `GET` | Authenticated | Returns full compliance matrix for specified facility. |
| `/api/datasets` | `GET` | Internal | Returns datasets for reconciliation and reviewer queues. |
| `/api/datasets/[id]` | `GET`, `PATCH` | Internal | Fetches or updates monthly reconciliation rows. |
| `/api/verifications/[id]/approve` | `POST` | Reviewer/Admin | Signs off and locks verification dataset. |
| `/api/verifications/[id]/reject` | `POST` | Reviewer/Admin | Rejects dataset and returns it with audit notes. |
| `/api/clarifications` | `GET`, `POST` | Authenticated | Lists or creates discrepancy clarification queries. |
| `/api/clarifications/[id]` | `PATCH` | Authenticated | Records client response and revised Drive link. |
| `/api/calendar` | `GET`, `PATCH` | Authenticated | Returns statutory calendar items or records extension. |
| `/api/notifications` | `GET`, `POST` | Authenticated | Fetches unread notifications or creates cross-role triggers. |
| `/api/portal/dashboard` | `GET` | Client/Admin | Returns client group overview, pending requests, and approved history. |

---

## 5. Deployment & Local Execution Guide

1. **Prerequisites**: Node.js v18+, MongoDB service running locally on `localhost:27017`.
2. **Environment File** (`.env`):
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/carbon_crunch_compliance
   JWT_SECRET=<generate-a-unique-random-secret-at-least-32-characters>
   PORT=3000
   ```
3. **Install Dependencies**: `npm install`
4. **Run Development Server**: `npm run dev` (Access at `http://localhost:3001`)
5. **Run Production Build Validation**: `npm run build`
6. **Create user accounts**: Sign in as an administrator and open **User Management**. Do not reseed production data.

---
*Report Generated: October 2026 · Carbon Crunch Platform Engineering Team*
