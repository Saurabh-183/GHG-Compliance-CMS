import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/models/User';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { AssessmentModel } from '@/models/Assessment';
import { DataRequirementModel } from '@/models/DataRequirement';
import { DatasetModel } from '@/models/Dataset';
import { ClarificationModel } from '@/models/Clarification';
import { CalendarItemModel } from '@/models/CalendarItem';
import { Notification } from '@/models/Notification';
import { generateClarificationEmailDraft } from '@/lib/utils';

export async function seedDatabase() {
  await connectToDatabase();

  // Clean existing collections
  await Promise.all([
    UserModel.deleteMany({}),
    ClientGroupModel.deleteMany({}),
    FacilityModel.deleteMany({}),
    ComplianceApplicabilityModel.deleteMany({}),
    AssessmentModel.deleteMany({}),
    DataRequirementModel.deleteMany({}),
    DatasetModel.deleteMany({}),
    ClarificationModel.deleteMany({}),
    CalendarItemModel.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Demo@123', 10);

  // 1. Create Users (RBAC)
  const adminUser = await UserModel.create({
    name: 'Saurabh Agnihotri',
    email: 'admin@carboncrunch.com',
    passwordHash,
    role: 'ADMIN',
    designation: 'Principal Compliance Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
  });

  const consultantUser = await UserModel.create({
    name: 'Priya Sharma',
    email: 'consultant@carboncrunch.com',
    passwordHash,
    role: 'CONSULTANT',
    designation: 'Senior Energy & Carbon Compliance Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
  });

  // All audit and reviewer sign-off permissions are unified under Consultant
  const reviewerUser = consultantUser;

  // 2. Create Trident Group
  const tridentGroup = await ClientGroupModel.create({
    name: 'Trident Group',
    code: 'TRIDENT',
    industry: 'Pulp & Paper, Textiles, Chemicals & Captive Power',
    headquarters: 'Ludhiana, Punjab, India',
    contactPerson: {
      name: 'Vikram Singh',
      email: 'vikram.singh@tridentindia.com',
      phone: '+91 98765 43210',
    },
  });

  // 3. Create External Client User linked to Trident Group
  const clientUser = await UserModel.create({
    name: 'Vikram Singh',
    email: 'client@tridentindia.com',
    passwordHash,
    role: 'CLIENT',
    clientGroupId: tridentGroup._id,
    authorizedFacilityIds: ['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'],
    designation: 'Head of Regulatory Affairs & Sustainability',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
  });

  // 4. Create Facilities
  const tridentPaper = await FacilityModel.create({
    facilityId: 'TRIDENT_PAPER',
    name: 'Trident Paper Complex',
    clientGroupId: tridentGroup._id,
    location: 'Dhaula, Barnala, Punjab - 148107',
    category: 'Designated Consumer (DC) - Pulp & Paper',
    assignedConsultantId: consultantUser._id,
    assignedReviewerId: reviewerUser._id,
    status: 'ACTIVE',
  });

  const tridentYarn = await FacilityModel.create({
    facilityId: 'TRIDENT_YARN',
    name: 'Trident Yarn Spinning Division',
    clientGroupId: tridentGroup._id,
    location: 'Budhni, Sehore, Madhya Pradesh - 466445',
    category: 'Designated Consumer (DC) - Textile Spinning',
    assignedConsultantId: consultantUser._id,
    assignedReviewerId: reviewerUser._id,
    status: 'ACTIVE',
  });

  const tridentTextiles = await FacilityModel.create({
    facilityId: 'TRIDENT_TEXTILES',
    name: 'Trident Home Textiles Division',
    clientGroupId: tridentGroup._id,
    location: 'Barnala, Punjab - 148101',
    category: 'Commercial Industrial Unit - Home Textiles',
    assignedConsultantId: consultantUser._id,
    assignedReviewerId: reviewerUser._id,
    status: 'ACTIVE',
  });

  // Seed all other client industrial conglomerates and facilities from Sheet6 PDF
  const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
  for (const mg of MOCK_CLIENT_GROUPS) {
    if (mg.code !== 'TRIDENT') {
      try {
        await ClientGroupModel.create({
          _id: new mongoose.Types.ObjectId(mg._id),
          name: mg.name,
          code: mg.code,
          industry: mg.industry,
          headquarters: mg.headquarters,
          contactPerson: mg.contactPerson,
        });
      } catch (err) {
        console.warn('Group already seeded or skipped:', mg.code, err);
      }
    }
  }

  for (const mf of MOCK_FACILITIES) {
    if (!['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'].includes(mf.facilityId)) {
      try {
        await FacilityModel.create({
          facilityId: mf.facilityId,
          name: mf.name,
          clientGroupId: new mongoose.Types.ObjectId(mf.clientGroupId),
          location: mf.location,
          category: mf.category,
          assignedConsultantId: consultantUser._id,
          assignedReviewerId: reviewerUser._id,
          status: 'ACTIVE',
        });
      } catch (err) {
        console.warn('Facility already seeded or skipped:', mf.facilityId, err);
      }
    }
  }

  // 5. Compliance Applicability for Trident Paper
  await ComplianceApplicabilityModel.create([
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'RCO',
      period: 'FY2024-25',
      isApplicable: true,
      authority: 'BEE / PSERC',
      ministry: 'Ministry of Power',
      notificationReference: 'PSERC/Tariff/RCO/2024/78',
      targetValue: 29.91,
      targetUnit: '%',
      targetMethodology: 'Renewable Consumption Obligation as % of Total Electricity Consumption',
      deadline: new Date('2025-06-30'),
      assignedConsultantId: consultantUser._id,
      assignedReviewerId: reviewerUser._id,
      workflowStatus: 'APPROVED',
      complianceOutcome: 'SHORTFALL',
      notes: 'Final shortfall of 5.00 MU recorded after REC adjustments.',
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'RCO',
      period: 'FY2025-26',
      isApplicable: true,
      authority: 'BEE / PSERC',
      ministry: 'Ministry of Power',
      notificationReference: 'BEE/RCO-TRAJECTORY/2025-26/102',
      targetValue: 33.01,
      targetUnit: '%',
      targetMethodology: 'Renewable share with solar, wind & biomass minimum mandates',
      deadline: new Date('2026-06-30'),
      assignedConsultantId: consultantUser._id,
      assignedReviewerId: reviewerUser._id,
      workflowStatus: 'DATA_COLLECTION',
      complianceOutcome: 'PENDING_DETERMINATION',
      notes: 'Current FY assessment under active monthly verification.',
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'RCO',
      period: 'FY2026-27',
      isApplicable: true,
      authority: 'BEE / PSERC',
      ministry: 'Ministry of Power',
      notificationReference: 'Draft Trajectory 2026-27',
      targetValue: 36.5,
      targetUnit: '%',
      targetMethodology: 'Mandatory RCO Trajectory',
      deadline: new Date('2027-06-30'),
      assignedConsultantId: consultantUser._id,
      assignedReviewerId: reviewerUser._id,
      workflowStatus: 'NOT_STARTED',
      complianceOutcome: 'PENDING_DETERMINATION',
      notes: 'Upcoming regulatory period.',
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'PAT',
      period: 'Cycle-II',
      isApplicable: true,
      authority: 'Bureau of Energy Efficiency (BEE)',
      ministry: 'Ministry of Power',
      notificationReference: 'BEE/PAT-II/DC-PULP-114',
      targetValue: 0.642,
      targetUnit: 'toe/tonne',
      targetMethodology: 'Specific Energy Consumption (SEC) Target Reduction',
      deadline: new Date('2025-03-31'),
      assignedConsultantId: consultantUser._id,
      assignedReviewerId: reviewerUser._id,
      workflowStatus: 'APPROVED',
      complianceOutcome: 'COMPLIANT',
      notes: 'M&V completed. E-Certs issued by BEE.',
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'CCTS',
      period: 'Baseline (2024-25)',
      isApplicable: true,
      authority: 'BEE / MoEFCC',
      ministry: 'Ministry of Environment, Forest and Climate Change',
      notificationReference: 'Carbon Credit Trading Scheme S.O. 2824(E)',
      targetValue: 1.84,
      targetUnit: 'tCO2e/tonne paper',
      targetMethodology: 'GHG Emission Intensity Baseline Boundary',
      deadline: new Date('2025-09-30'),
      assignedConsultantId: consultantUser._id,
      assignedReviewerId: reviewerUser._id,
      workflowStatus: 'UNDER_REVIEW',
      complianceOutcome: 'PENDING_DETERMINATION',
      notes: 'Baseline verification under audit.',
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'CEA',
      period: 'Monthly (FY2025-26)',
      isApplicable: true,
      authority: 'Central Electricity Authority (CEA)',
      ministry: 'Ministry of Power',
      notificationReference: 'Section 74 of the Electricity Act 2003',
      targetValue: null,
      targetUnit: 'MU',
      targetMethodology: 'Monthly Electricity Returns Filing (Form A/B/C)',
      deadline: new Date('2025-11-15'),
      assignedConsultantId: consultantUser._id,
      assignedReviewerId: reviewerUser._id,
      workflowStatus: 'DATA_COLLECTION',
      complianceOutcome: 'COMPLIANT',
      notes: 'Recurring monthly returns up to June 2025 submitted.',
    },
  ]);

  // 6. Historical Assessment (RCO FY 2024-25)
  const historicalRcoAssessment = await AssessmentModel.create({
    facilityId: 'TRIDENT_PAPER',
    complianceType: 'RCO',
    period: 'FY2024-25',
    workflowStatus: 'APPROVED',
    complianceOutcome: 'SHORTFALL',
    isHistorical: true,
    version: 2,
    approvedBy: reviewerUser._id,
    approvedAt: new Date('2025-07-15T11:30:00Z'),
    assignedConsultantId: consultantUser._id,
    assignedReviewerId: reviewerUser._id,
    notes: 'Approved historical assessment. Shortfall of 5.00 MU confirmed. Submission acknowledgment filed with PSERC.',
    documentLinks: {
      finalReportUrl: 'https://drive.google.com/file/d/1A2B3C4D5E6F_Trident_Paper_RCO_FY24-25_Final_Report.pdf/view',
      submissionAckUrl: 'https://drive.google.com/file/d/2B3C4D5E6F7G_PSERC_RCO_Submission_Ack_FY24-25.pdf/view',
      calculationWorkbookUrl: 'https://drive.google.com/file/d/3C4D5E6F7G8H_Trident_Paper_RCO_Model_v2.4.xlsx/view',
      evidenceFolderUrl: 'https://drive.google.com/drive/folders/4D5E6F7G8H9I_Trident_Paper_Compliance_Evidence_FY24',
    },
    metrics: [
      {
        key: 'applicable_rco_target',
        name: 'Applicable RCO Target',
        value: 29.91,
        unit: '%',
        period: 'FY2024-25',
        source: 'PSERC Notification Ref 2024/78',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 1,
      },
      {
        key: 'achieved_renewable_share',
        name: 'Achieved Renewable Share',
        value: 25.51,
        unit: '%',
        period: 'FY2024-25',
        source: 'Audited Power Purchase Registry',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 2,
      },
      {
        key: 'renewable_electricity',
        name: 'Renewable Electricity Procured',
        value: 76.53,
        unit: 'MU',
        period: 'FY2024-25',
        source: 'DISCOM Green Tariff & Captive Solar',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 2,
      },
      {
        key: 'non_renewable_electricity',
        name: 'Non-Renewable Electricity',
        value: 223.47,
        unit: 'MU',
        period: 'FY2024-25',
        source: 'PSPCL Grid Import Bills',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 2,
      },
      {
        key: 'grid_electricity',
        name: 'Total Applicable Grid Electricity',
        value: 300.0,
        unit: 'MU',
        period: 'FY2024-25',
        source: 'Substation Meter Reconciliation',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 2,
      },
      {
        key: 'calculated_shortfall',
        name: 'Calculated Shortfall',
        value: 5.0,
        unit: 'MU',
        period: 'FY2024-25',
        source: 'Reconciliation Model vs Mandate',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 2,
      },
      {
        key: 'rec_adjustment',
        name: 'REC Adjustment',
        value: 0.0,
        unit: 'MU',
        period: 'FY2024-25',
        source: 'IEX / PXIL Certificate Ledger',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 1,
      },
      {
        key: 'final_obligation_status',
        name: 'Final Obligation Status',
        value: 'Shortfall Penalty Determination Pending',
        unit: 'Status',
        period: 'FY2024-25',
        source: 'PSERC Regulatory Filing',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 2,
      },
    ],
  });

  // 7. Current Year Assessment (RCO FY 2025-26)
  const currentRcoAssessment = await AssessmentModel.create({
    facilityId: 'TRIDENT_PAPER',
    complianceType: 'RCO',
    period: 'FY2025-26',
    workflowStatus: 'DATA_COLLECTION',
    complianceOutcome: 'PENDING_DETERMINATION',
    isHistorical: false,
    version: 1,
    assignedConsultantId: consultantUser._id,
    assignedReviewerId: reviewerUser._id,
    notes: 'Ongoing current year assessment. Data collection for Q1 & Q2 in progress.',
    documentLinks: {
      calculationWorkbookUrl: 'https://drive.google.com/file/d/5E6F7G8H9I0J_Trident_Paper_FY25-26_Draft_Model.xlsx/view',
      evidenceFolderUrl: 'https://drive.google.com/drive/folders/6F7G8H9I0J1K_Trident_Paper_FY25-26_Data_Evidence',
    },
    metrics: [
      {
        key: 'applicable_rco_target',
        name: 'Applicable RCO Target',
        value: 33.01,
        unit: '%',
        period: 'FY2025-26',
        source: 'BEE MoP Trajectory 2025-26',
        isProvisional: false,
        approvalStatus: 'APPROVED',
        version: 1,
      },
      {
        key: 'achieved_renewable_share',
        name: 'Achieved Renewable Share (Provisional)',
        value: 28.15,
        unit: '%',
        period: 'FY2025-26',
        source: 'Provisional Q1 Monthly Sums',
        isProvisional: true,
        approvalStatus: 'PENDING',
        version: 1,
      },
      {
        key: 'renewable_electricity',
        name: 'Renewable Electricity (YTD)',
        value: 22.4,
        unit: 'MU',
        period: 'FY2025-26',
        source: 'Q1 Solar + Open Access',
        isProvisional: true,
        approvalStatus: 'PENDING',
        version: 1,
      },
      {
        key: 'non_renewable_electricity',
        name: 'Non-Renewable Electricity (YTD)',
        value: 57.18,
        unit: 'MU',
        period: 'FY2025-26',
        source: 'PSPCL Grid Invoices Q1',
        isProvisional: true,
        approvalStatus: 'PENDING',
        version: 1,
      },
      {
        key: 'grid_electricity',
        name: 'Total Grid Electricity (YTD)',
        value: 79.58,
        unit: 'MU',
        period: 'FY2025-26',
        source: 'Q1 Monthly Sums',
        isProvisional: true,
        approvalStatus: 'PENDING',
        version: 1,
      },
      {
        key: 'calculated_shortfall',
        name: 'Calculated Shortfall / Surplus',
        value: 'Assessment Pending',
        unit: 'MU',
        period: 'FY2025-26',
        source: 'Provisional Model',
        isProvisional: true,
        approvalStatus: 'PENDING',
        version: 1,
      },
    ],
  });

  // 8. Data Requirements (Checklist) for FY 2025-26
  const gridElectricityReq = await DataRequirementModel.create({
    facilityId: 'TRIDENT_PAPER',
    period: 'FY2025-26',
    title: 'Monthly Grid Electricity Invoices & Consumption Log',
    category: 'COMMON_ENERGY',
    linkedCompliances: ['RCO', 'CCTS', 'PAT'],
    description: 'DISCOM monthly electricity bills (PSPCL 66kV feeder) and plant internal Excel log for April 2025 to March 2026.',
    isApplicable: true,
    submissionStatus: 'RECEIVED',
    verificationStatus: 'UNDER_REVIEW',
    requestedAt: new Date('2025-05-01'),
    dueDate: new Date('2025-07-20'),
    submittedDriveLinks: [
      {
        url: 'https://drive.google.com/file/d/7G8H9I0J1K2L_Trident_Paper_Grid_Consumption_FY25-26_Q1.xlsx/view',
        submittedAt: new Date('2025-07-10T14:20:00Z'),
        submittedBy: 'Vikram Singh (Client)',
        description: 'Client month-wise grid consumption Excel (Apr-Jun 2025)',
      },
      {
        url: 'https://drive.google.com/drive/folders/8H9I0J1K2L3M_PSPCL_DISCOM_Bills_Q1_2025',
        submittedAt: new Date('2025-07-12T10:05:00Z'),
        submittedBy: 'Vikram Singh (Client)',
        description: 'Scanned official PSPCL electricity bills for Apr, May, Jun 2025',
      },
    ],
  });

  await DataRequirementModel.create([
    {
      facilityId: 'TRIDENT_PAPER',
      period: 'FY2025-26',
      title: 'Renewable Energy Purchase & Open Access Invoices',
      category: 'COMMON_ENERGY',
      linkedCompliances: ['RCO'],
      description: 'Monthly open access wheeling invoices, RE certificates, and captive solar generation meter readings.',
      isApplicable: true,
      submissionStatus: 'PARTIALLY_RECEIVED',
      verificationStatus: 'EVIDENCE_PENDING',
      requestedAt: new Date('2025-05-01'),
      dueDate: new Date('2025-08-15'),
      submittedDriveLinks: [
        {
          url: 'https://drive.google.com/file/d/9I0J1K2L3M4N_Solar_Gen_Log_Q1.xlsx/view',
          submittedAt: new Date('2025-07-14T09:30:00Z'),
          submittedBy: 'Vikram Singh (Client)',
          description: 'On-site 5MW solar roof generation log for Q1',
        },
      ],
    },
    {
      facilityId: 'TRIDENT_PAPER',
      period: 'FY2025-26',
      title: 'Fuel Consumption & GCV Test Certificates',
      category: 'COMMON_ENERGY',
      linkedCompliances: ['PAT', 'CCTS'],
      description: 'Monthly boiler biomass rice-husk and imported coal consumption along with NABL accredited lab GCV test certificates.',
      isApplicable: true,
      submissionStatus: 'REQUESTED',
      verificationStatus: 'NOT_STARTED',
      requestedAt: new Date('2025-06-01'),
      dueDate: new Date('2025-08-30'),
      submittedDriveLinks: [],
    },
    {
      facilityId: 'TRIDENT_PAPER',
      period: 'FY2025-26',
      title: 'Finished Paper Production & Machine Operating Hours',
      category: 'COMPLIANCE_SPECIFIC',
      linkedCompliances: ['PAT', 'CCTS'],
      description: 'Daily/monthly net saleable paper production records, product grade mix, and machine running hours for normalization.',
      isApplicable: true,
      submissionStatus: 'RECEIVED',
      verificationStatus: 'UNDER_REVIEW',
      requestedAt: new Date('2025-05-15'),
      dueDate: new Date('2025-07-31'),
      submittedDriveLinks: [
        {
          url: 'https://drive.google.com/file/d/0J1K2L3M4N5O_Production_Records_FY25-26_Q1.xlsx/view',
          submittedAt: new Date('2025-07-16T16:45:00Z'),
          submittedBy: 'Vikram Singh (Client)',
          description: 'Certified production ledger by Plant Head',
        },
      ],
    },
  ]);

  // 9. Reconciliation Dataset: Trident Paper Grid Electricity (Module 3 seeded case!)
  const dataset = await DatasetModel.create({
    facilityId: 'TRIDENT_PAPER',
    datasetType: 'GRID_ELECTRICITY',
    period: 'FY2025-26',
    dataRequirementId: gridElectricityReq._id,
    submissionStatus: 'RECEIVED',
    verificationStatus: 'CLARIFICATION_REQUIRED',
    toleranceDefault: 0,
    months: [
      {
        month: '2025-04',
        declaredValue: 1240000,
        evidenceValue: 1240000,
        unit: 'kWh',
        tolerance: 0,
        variance: 0,
        variancePercentage: 0,
        result: 'MATCHED',
        consumerNumber: 'PSPCL-BARNALA-66KV-0042',
        meterNumber: 'L&T-EM-99214',
        billingPeriod: '01-Apr-2025 to 30-Apr-2025',
        sourceDocumentUrl: 'https://drive.google.com/file/d/7G8H9I0J1K2L_Trident_Paper_Grid_Consumption_FY25-26_Q1.xlsx/view',
        evidenceDocumentUrl: 'https://drive.google.com/file/d/PSPCL_Apr2025_Bill.pdf/view',
        consultantNotes: 'Exact match with DISCOM energy bill. Verified power factor 0.99.',
      },
      {
        month: '2025-05',
        declaredValue: 1310000,
        evidenceValue: 1310000,
        unit: 'kWh',
        tolerance: 0,
        variance: 0,
        variancePercentage: 0,
        result: 'MATCHED',
        consumerNumber: 'PSPCL-BARNALA-66KV-0042',
        meterNumber: 'L&T-EM-99214',
        billingPeriod: '01-May-2025 to 31-May-2025',
        sourceDocumentUrl: 'https://drive.google.com/file/d/7G8H9I0J1K2L_Trident_Paper_Grid_Consumption_FY25-26_Q1.xlsx/view',
        evidenceDocumentUrl: 'https://drive.google.com/file/d/PSPCL_May2025_Bill.pdf/view',
        consultantNotes: 'Exact match verified. No TOD surcharge discrepancy.',
      },
      {
        month: '2025-06',
        declaredValue: 1280000,
        evidenceValue: 1265000,
        unit: 'kWh',
        tolerance: 0,
        variance: 15000,
        variancePercentage: 1.186,
        result: 'MISMATCH',
        consumerNumber: 'PSPCL-BARNALA-66KV-0042',
        meterNumber: 'L&T-EM-99214',
        billingPeriod: '01-Jun-2025 to 30-Jun-2025',
        sourceDocumentUrl: 'https://drive.google.com/file/d/7G8H9I0J1K2L_Trident_Paper_Grid_Consumption_FY25-26_Q1.xlsx/view',
        evidenceDocumentUrl: 'https://drive.google.com/file/d/PSPCL_Jun2025_Bill.pdf/view',
        consultantNotes: 'Mismatch identified: Declared Excel states 1,280,000 kWh while PSPCL bill specifies 1,265,000 kWh net energy recorded. Discrepancy of 15,000 kWh (1.186%). Clarification raised with client.',
      },
      {
        month: '2025-07',
        declaredValue: 1350000,
        evidenceValue: null,
        unit: 'kWh',
        tolerance: 0,
        variance: 1350000,
        variancePercentage: 100,
        result: 'EVIDENCE_MISSING',
        consumerNumber: 'PSPCL-BARNALA-66KV-0042',
        meterNumber: 'L&T-EM-99214',
        billingPeriod: '01-Jul-2025 to 31-Jul-2025',
        sourceDocumentUrl: 'https://drive.google.com/file/d/7G8H9I0J1K2L_Trident_Paper_Grid_Consumption_FY25-26_Q1.xlsx/view',
        evidenceDocumentUrl: undefined,
        consultantNotes: 'Client logged estimated consumption in Excel; official DISCOM bill has not been uploaded yet.',
      },
    ],
    consultantSubmission: {
      consultantId: consultantUser._id,
      consultantName: consultantUser.name,
      submittedAt: new Date('2025-07-18T10:15:00Z'),
      summary: 'Q1 Grid electricity consumption reconciliation completed. June 2025 flagged for 15,000 kWh variance.',
    },
    auditTrail: [
      {
        timestamp: new Date('2025-07-10T14:20:00Z'),
        userId: clientUser._id.toString(),
        userName: clientUser.name,
        action: 'SUBMITTED_EXCEL',
        details: 'Client Vikram Singh submitted Q1 consumption Excel via Client Portal.',
      },
      {
        timestamp: new Date('2025-07-18T09:45:00Z'),
        userId: consultantUser._id.toString(),
        userName: consultantUser.name,
        action: 'RECONCILIATION_PERFORMED',
        details: 'Consultant Priya Sharma reconciled April-July declared data against official DISCOM bills.',
      },
      {
        timestamp: new Date('2025-07-18T10:00:00Z'),
        userId: consultantUser._id.toString(),
        userName: consultantUser.name,
        action: 'MISMATCH_FLAGGED',
        details: 'Variance of 15,000 kWh detected for June 2025. Verification status transitioned to CLARIFICATION_REQUIRED.',
      },
    ],
  });

  // Link dataset to data requirement
  gridElectricityReq.datasetId = dataset._id;
  await gridElectricityReq.save();

  // 10. Clarification for June 2025 (PRD Section 7.2)
  const clarificationEmail = generateClarificationEmailDraft({
    facilityName: 'Trident Paper Complex',
    month: 'June 2025',
    parameter: 'Grid Electricity Consumption',
    declaredValue: 1280000,
    evidenceValue: 1265000,
    variance: 15000,
    unit: 'kWh',
  });

  const clarification = await ClarificationModel.create({
    facilityId: 'TRIDENT_PAPER',
    datasetId: dataset._id,
    month: '2025-06',
    parameter: 'Grid Electricity Consumption',
    declaredValue: 1280000,
    evidenceValue: 1265000,
    variance: 15000,
    variancePercentage: 1.186,
    comment: 'Please clarify the difference of 15,000 kWh between the June 2025 grid consumption Excel and the corresponding electricity bill. Kindly share a revised Excel or supporting justification.',
    supportingLink: 'https://drive.google.com/file/d/PSPCL_Jun2025_Bill.pdf/view',
    status: 'OPEN',
    emailDraft: clarificationEmail,
    raisedBy: consultantUser._id,
    raisedByName: consultantUser.name,
    raisedAt: new Date('2025-07-18T10:05:00Z'),
  });

  // Attach clarificationId to June record in dataset
  dataset.months[2].clarificationId = clarification._id.toString();
  await dataset.save();

  // 11. Compliance Calendar Deadlines (PRD Section 9)
  await CalendarItemModel.create([
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'RCO',
      reportingPeriod: 'FY2025-26 (Q1 Reconciliation)',
      regulatoryDueDate: new Date('2025-09-30'),
      internalDeadline: new Date('2025-08-15'),
      clientDataSubmissionDeadline: new Date('2025-07-20'),
      assignedConsultantId: consultantUser._id,
      status: 'PENDING',
      isRecurringCEA: false,
      extensionHistory: [],
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'CEA',
      reportingPeriod: 'June 2025 Electricity Returns',
      regulatoryDueDate: new Date('2025-07-15'),
      internalDeadline: new Date('2025-07-10'),
      clientDataSubmissionDeadline: new Date('2025-07-05'),
      assignedConsultantId: consultantUser._id,
      status: 'COMPLETED',
      actualSubmissionDate: new Date('2025-07-14'),
      isRecurringCEA: true,
      extensionHistory: [],
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'CEA',
      reportingPeriod: 'July 2025 Electricity Returns',
      regulatoryDueDate: new Date('2025-08-15'),
      internalDeadline: new Date('2025-08-10'),
      clientDataSubmissionDeadline: new Date('2025-08-05'),
      assignedConsultantId: consultantUser._id,
      status: 'UPCOMING',
      isRecurringCEA: true,
      extensionHistory: [],
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'PAT',
      reportingPeriod: 'PAT Monitoring Period Assessment',
      regulatoryDueDate: new Date('2025-10-31'),
      internalDeadline: new Date('2025-09-30'),
      clientDataSubmissionDeadline: new Date('2025-09-15'),
      assignedConsultantId: consultantUser._id,
      status: 'PENDING',
      isRecurringCEA: false,
      extensionHistory: [
        {
          oldDate: new Date('2025-08-31'),
          newDate: new Date('2025-10-31'),
          reason: 'BEE Extension notification for DC pulp & paper sector data submission.',
          notificationRef: 'BEE/PAT-Ext/2025/19',
          revisedAt: new Date('2025-06-15'),
        },
      ],
    },
    {
      facilityId: 'TRIDENT_PAPER',
      complianceType: 'CCTS',
      reportingPeriod: 'Baseline Boundary Finalization',
      regulatoryDueDate: new Date('2025-11-30'),
      internalDeadline: new Date('2025-10-15'),
      clientDataSubmissionDeadline: new Date('2025-10-01'),
      assignedConsultantId: consultantUser._id,
      status: 'UPCOMING',
      isRecurringCEA: false,
      extensionHistory: [],
    },
  ]);

  // 10. Cross-Role Notification Triggers (Sender & Receiver Events)
  await Notification.create([
    {
      recipientRole: 'CLIENT',
      recipientUserId: clientUser._id.toString(),
      senderRole: 'CONSULTANT',
      senderName: 'Priya Sharma (Senior Energy & Carbon Consultant)',
      type: 'CLARIFICATION_RAISED',
      title: 'Discrepancy Clarification Required',
      message: 'Reconciliation query raised for June 2025 Grid Electricity bill. A variance of +15,000 kWh was detected between declared log and DISCOM invoice.',
      facilityId: 'TRIDENT_PAPER',
      linkUrl: '/portal/submissions',
      isRead: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
    },
    {
      recipientRole: 'CONSULTANT',
      recipientUserId: consultantUser._id.toString(),
      senderRole: 'CLIENT',
      senderName: 'Vikram Singh (Trident Group)',
      type: 'EVIDENCE_SUBMITTED',
      title: 'Google Drive Document Submitted',
      message: 'Client uploaded verified Google Drive spreadsheet: "Q1 Grid Consumption Verification Workbook FY2025-26".',
      facilityId: 'TRIDENT_PAPER',
      linkUrl: `/datasets/${dataset._id}/verify`,
      isRead: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 5), // 5 hours ago
    },
    {
      recipientRole: 'CONSULTANT',
      recipientUserId: consultantUser._id.toString(),
      senderRole: 'CONSULTANT',
      senderName: 'Priya Sharma (Consultant)',
      type: 'REVIEW_REQUESTED',
      title: 'Verification Sign-Off Ready',
      message: 'Trident Paper FY2025-26 Grid Electricity Reconciliation v1 audited and ready for sign-off & lock.',
      facilityId: 'TRIDENT_PAPER',
      linkUrl: '/approvals',
      isRead: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 12), // 12 hours ago
    },
    {
      recipientRole: 'CONSULTANT',
      recipientUserId: consultantUser._id.toString(),
      senderRole: 'CONSULTANT',
      senderName: 'Priya Sharma (Compliance Lead)',
      type: 'DATASET_APPROVED',
      title: 'Audit Sign-off Approved & Locked',
      message: 'FY2024-25 RCO Compliance Assessment verified against PSERC regulations and approved.',
      facilityId: 'TRIDENT_PAPER',
      linkUrl: '/facilities/TRIDENT_PAPER',
      isRead: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24), // 1 day ago
    },
    {
      recipientRole: 'ALL',
      senderRole: 'SYSTEM',
      senderName: 'Statutory Compliance Bot',
      type: 'DEADLINE_EXTENDED',
      title: 'Statutory Due Date Extension Logged',
      message: 'BEE notified extension for PAT DC Assessment to 31-Oct-2025 (Ref: BEE/PAT-Ext/2025/19).',
      facilityId: 'TRIDENT_PAPER',
      linkUrl: '/calendar',
      isRead: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 48), // 2 days ago
    },
  ]);

  return {
    users: {
      admin: adminUser.email,
      consultant: consultantUser.email,
      reviewer: reviewerUser.email,
      client: clientUser.email,
    },
    group: tridentGroup.name,
    facility: tridentPaper.facilityId,
    datasetId: dataset._id.toString(),
    clarificationId: clarification._id.toString(),
    historicalAssessmentId: historicalRcoAssessment._id.toString(),
    currentAssessmentId: currentRcoAssessment._id.toString(),
  };
}
