/** Static validation of the reviewed historical report coverage master. */
import fs from 'node:fs';
import path from 'node:path';

const masterPath = path.join(process.cwd(), 'data/compliance/report-coverage-master.json');
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const normalize = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

if (!Array.isArray(master.facilities) || master.facilities.length !== 117) {
  fail(`Expected exactly 117 report-list rows; found ${master.facilities?.length ?? 'invalid'}.`);
}
const names = new Set();
let rows = 0;
const counts = { RCO: 0, RPO: 0, PAT: 0, CCTS: 0 };
for (const entry of master.facilities || []) {
  if (!entry.name) { fail('A source row has no facility name.'); continue; }
  const key = normalize(entry.name);
  if (names.has(key)) fail(`Duplicate normalized facility name: ${entry.name}`);
  names.add(key);
  for (const [framework, years] of [['RCO', entry.rco || []], ['RPO', entry.rpo || []]]) {
    for (const year of years) {
      if (!['FY2024-25', 'FY2025-26'].includes(year)) fail(`${framework} has unsupported historical year ${year} for ${entry.name}.`);
      counts[framework] += 1;
      rows += 1;
    }
  }
  if (entry.pat === true) { counts.PAT += 1; rows += 1; }
  if (entry.ccts === true) { counts.CCTS += 1; rows += 1; }
  if (entry.pat && entry.pat !== true) fail(`PAT must be a boolean for ${entry.name}.`);
  if (entry.ccts && entry.ccts !== true) fail(`CCTS must be a boolean for ${entry.name}.`);
}
const jodhani = (master.facilities || []).filter((entry) => /^Jodhani Paper Unit [123]$/.test(entry.name)).map((entry) => entry.name).sort();
if (jodhani.join('|') !== 'Jodhani Paper Unit 1|Jodhani Paper Unit 2|Jodhani Paper Unit 3') {
  fail(`Jodhani must contain three separate units; found ${jodhani.join(', ') || 'none'}.`);
}
if (rows !== 209) fail(`Expected 209 independent applicability rows; found ${rows}.`);
if (counts.RCO !== 179 || counts.RPO !== 5 || counts.PAT !== 8 || counts.CCTS !== 17) {
  fail(`Unexpected framework counts: ${JSON.stringify(counts)}.`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS: 117 unique report-list facilities.');
console.log('PASS: RCO and RPO are independent coverage columns.');
console.log('PASS: PAT and CCTS are represented only for FY2025-26.');
console.log('PASS: Jodhani Paper Units 1, 2 and 3 are separate facilities.');
console.log(`PASS: ${rows} applicability rows (${JSON.stringify(counts)}).`);
