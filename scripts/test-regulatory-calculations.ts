import assert from 'node:assert/strict';
import { REGULATORY_TEMPLATES, calculateRegulatoryValues } from '../src/lib/regulatory/regulatoryTemplates';

for (const template of REGULATORY_TEMPLATES) {
  const keys = template.sections.flatMap(section => section.fields.map(field => field.key));
  assert.equal(new Set(keys).size, keys.length, `Duplicate field key in ${template.id}`);
  assert.ok(keys.length > 0, `No fields in ${template.id}`);
}

const rco = calculateRegulatoryValues('RCO_FORM_A_CPP_OPEN_ACCESS', {
  grossTotalElectricity: 74.621,
  rcoNotifiedPercent: 33.01,
  grossNonFossilConsumption: 52.638,
  recsEnergy: 0
});
assert.ok(Math.abs(rco.rcoTarget - 24.632) < 0.001);
assert.ok(Math.abs(rco.rcoCompliancePercent - 70.54) < 0.01);
assert.ok(Math.abs(rco.rcoSurplusDeficit - 28.006) < 0.001);

const ccts = calculateRegulatoryValues('CCTS_PULP_PAPER_SUMMARY', {
  solidFuelEnergyEmission__ASSESSMENT: 175030.575,
  steamExportAdjustment__ASSESSMENT: 21125.632,
  outsideElectricityEmission__ASSESSMENT: 6613.519,
  electricityExportAdjustment__ASSESSMENT: 53769.530,
  ghgEquivalentProduction__ASSESSMENT: 83426
});
assert.ok(Math.abs(ccts.totalScope1 - 153904.943) < 0.001);
assert.ok(Math.abs(ccts.totalScope2 - (-47156.011)) < 0.001);
assert.ok(Math.abs(ccts.totalScope1Scope2 - 106748.931) < 0.01);
assert.ok(Math.abs(ccts.emissionIntensity - 1.28) < 0.001);

console.log(`Passed: ${REGULATORY_TEMPLATES.length} templates, unique field keys, RCO and CCTS source-sheet calculation checks.`);
