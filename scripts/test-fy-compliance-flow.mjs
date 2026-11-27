#!/usr/bin/env node
/**
 * Live API smoke test for Admin -> FY applicability -> Consultant data request.
 * Uses existing records and creates/updates one RCO applicability plus one DRAFT request.
 * Run against a local/staging environment only, never production.
 */
import assert from 'node:assert/strict';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const FACILITY_ID = (process.env.TEST_FACILITY_ID || '').trim().toUpperCase();
const PERIOD = (process.env.TEST_FINANCIAL_YEAR || 'FY2026-27').trim().toUpperCase();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const CONSULTANT_TOKEN = process.env.CONSULTANT_TOKEN || '';
const CONSULTANT_USER_ID = process.env.TEST_CONSULTANT_USER_ID || '';

if (!FACILITY_ID || !ADMIN_TOKEN || !CONSULTANT_TOKEN) {
  console.error(`\nMissing required environment variables.\n\nRequired:\n  TEST_FACILITY_ID=existing facility ID\n  ADMIN_TOKEN=valid Admin JWT\n  CONSULTANT_TOKEN=valid Consultant JWT authorized for that facility\nOptional:\n  BASE_URL=http://localhost:3001\n  TEST_FINANCIAL_YEAR=FY2026-27\n  TEST_CONSULTANT_USER_ID=Mongo user ID (if assigning consultant)\n\nPowerShell example:\n  $env:TEST_FACILITY_ID='FACILITY_CODE'\n  $env:ADMIN_TOKEN='...'; $env:CONSULTANT_TOKEN='...'\n  node scripts/test-fy-compliance-flow.mjs\n`);
  process.exit(2);
}

const results = [];
async function api(name, path, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  assert.equal(response.status, expected,
    `${name}: expected HTTP ${expected}, got ${response.status}. Response: ${raw.slice(0, 1200)}`);
  results.push({ name, status: 'PASS', http: response.status });
  console.log(`PASS ${name} (HTTP ${response.status})`);
  return data;
}

try {
  console.log(`\nFY compliance workflow smoke test\nBase URL: ${BASE_URL}\nFacility: ${FACILITY_ID}\nFinancial year: ${PERIOD}\n`);

  // 1. Admin configures RCO for the selected financial year.
  const saved = await api('Admin can configure RCO for financial year', '/api/compliance-applicability', {
    method: 'POST', token: ADMIN_TOKEN, expected: 200,
    body: {
      facilityId: FACILITY_ID,
      complianceType: 'RCO',
      period: PERIOD,
      isApplicable: true,
      authority: 'BEE',
      ministry: 'Ministry of Power',
      targetValue: null,
      targetUnit: '%',
      workflowStatus: 'NOT_STARTED',
      complianceOutcome: 'PENDING_DETERMINATION',
      ...(CONSULTANT_USER_ID ? { assignedConsultantId: CONSULTANT_USER_ID } : {}),
      notes: 'Automated FY compliance smoke test',
    },
  });
  assert.equal(saved.success, true, 'Admin save response must report success');

  // 2. Confirm persisted configuration is visible to Admin and Consultant.
  const adminRows = await api('Admin can read saved applicability',
    `/api/compliance-applicability?facilityId=${encodeURIComponent(FACILITY_ID)}`,
    { token: ADMIN_TOKEN });
  const rco = (adminRows.data || []).find(x => x.complianceType === 'RCO' && String(x.period).toUpperCase() === PERIOD && x.isApplicable === true);
  assert.ok(rco, `RCO applicability was not persisted for ${FACILITY_ID}/${PERIOD}`);

  const consultantRows = await api('Consultant can read authorized facility applicability',
    `/api/compliance-applicability?facilityId=${encodeURIComponent(FACILITY_ID)}`,
    { token: CONSULTANT_TOKEN });
  assert.ok((consultantRows.data || []).some(x => x.complianceType === 'RCO' && String(x.period).toUpperCase() === PERIOD && x.isApplicable === true),
    'Consultant did not see the enabled RCO applicability');

  // 3. Consultant must not be allowed to change applicability.
  await api('Consultant cannot configure applicability', '/api/compliance-applicability', {
    method: 'POST', token: CONSULTANT_TOKEN, expected: 403,
    body: {
      facilityId: FACILITY_ID, complianceType: 'CCTS', period: PERIOD,
      isApplicable: true, authority: 'BEE', targetValue: null,
    },
  });

  // 4. Consultant creates a DRAFT RCO request (does not notify the client).
  const draft = await api('Consultant can create RCO draft for enabled FY', '/api/requirements', {
    method: 'POST', token: CONSULTANT_TOKEN, expected: 201,
    body: {
      facilityId: FACILITY_ID,
      period: PERIOD,
      title: `RCO FY compliance smoke test ${new Date().toISOString()}`,
      description: 'Automated smoke test draft. Safe to delete after verification.',
      category: 'COMPLIANCE_SPECIFIC',
      linkedCompliances: ['RCO'],
      dataCategory: 'RCO',
      requiredDocuments: ['Smoke-test evidence placeholder'],
      saveAsDraft: true,
      reportingFrequency: 'ONE_TIME',
    },
  });
  assert.equal(draft.success, true, 'Consultant draft creation must succeed');

  // 5. Verify the request is retrievable for the same facility and FY.
  const requests = await api('Consultant can read FY data requests',
    `/api/requirements?facilityId=${encodeURIComponent(FACILITY_ID)}&period=${encodeURIComponent(PERIOD)}`,
    { token: CONSULTANT_TOKEN });
  assert.ok((requests.data || []).some(x => String(x.title || '').startsWith('RCO FY compliance smoke test ')),
    'Created RCO draft was not returned by the data requests API');

  console.log(`\n${results.length}/${results.length} checks passed.\n`);
  console.log('Manual frontend follow-up: sign in as Admin, verify RCO is enabled for this facility/FY; then sign in as the assigned Consultant and verify RCO appears for that same FY.');
  console.log('Cleanup: delete the generated DRAFT request from the UI after inspection. The RCO applicability record is intentionally retained.');
} catch (error) {
  console.error('\nFAIL:', error?.stack || error);
  console.error(`\nCompleted ${results.length} checks before failure.`);
  process.exit(1);
}
