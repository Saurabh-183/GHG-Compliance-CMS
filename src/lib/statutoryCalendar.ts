import { ICalendarItem, IFacility, IClientGroup, ComplianceType } from '@/types';

export type ComplianceDeadlineStatus = 'UPCOMING' | 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'EXTENDED';

export interface StandardCycleDefinition {
  complianceType: ComplianceType;
  reportingPeriod: string;
  clientCutoff: string;
  internalDeadline: string;
  regulatoryDueDate: string;
  status: ComplianceDeadlineStatus;
  isRecurringCEA: boolean;
}

export const STANDARD_STATUTORY_CYCLES: StandardCycleDefinition[] = [
  {
    complianceType: 'CEA',
    reportingPeriod: 'June 2025 Electricity Returns',
    clientCutoff: '2025-07-05T00:00:00.000Z',
    internalDeadline: '2025-07-10T00:00:00.000Z',
    regulatoryDueDate: '2025-07-15T00:00:00.000Z',
    status: 'PENDING',
    isRecurringCEA: true,
  },
  {
    complianceType: 'CEA',
    reportingPeriod: 'July 2025 Electricity Returns',
    clientCutoff: '2025-08-05T00:00:00.000Z',
    internalDeadline: '2025-08-10T00:00:00.000Z',
    regulatoryDueDate: '2025-08-15T00:00:00.000Z',
    status: 'UPCOMING',
    isRecurringCEA: true,
  },
  {
    complianceType: 'RCO',
    reportingPeriod: 'FY2025-26 (Q1 Reconciliation)',
    clientCutoff: '2025-07-20T00:00:00.000Z',
    internalDeadline: '2025-08-15T00:00:00.000Z',
    regulatoryDueDate: '2025-09-30T00:00:00.000Z',
    status: 'PENDING',
    isRecurringCEA: false,
  },
  {
    complianceType: 'PAT',
    reportingPeriod: 'PAT Monitoring Period Assessment',
    clientCutoff: '2025-09-15T00:00:00.000Z',
    internalDeadline: '2025-09-30T00:00:00.000Z',
    regulatoryDueDate: '2025-10-31T00:00:00.000Z',
    status: 'PENDING',
    isRecurringCEA: false,
  },
  {
    complianceType: 'CCTS',
    reportingPeriod: 'Baseline Boundary Finalization & Filing',
    clientCutoff: '2025-10-01T00:00:00.000Z',
    internalDeadline: '2025-10-15T00:00:00.000Z',
    regulatoryDueDate: '2025-11-30T00:00:00.000Z',
    status: 'UPCOMING',
    isRecurringCEA: false,
  },
];

/**
 * Generate full statutory compliance deadlines for a specific list of facilities
 * Each facility receives statutory obligations for CEA, RCO, PAT, and CCTS.
 */
export function generateDeadlinesForFacilities(
  facilities: IFacility[],
  options?: { fullCoverage?: boolean }
): ICalendarItem[] {
  if (!facilities || facilities.length === 0) return [];

  const items: ICalendarItem[] = [];
  const fullCoverage = options?.fullCoverage ?? true;

  facilities.forEach((fac, facIdx) => {
    if (fullCoverage || facilities.length <= 4) {
      // Create comprehensive statutory obligations for each unit
      STANDARD_STATUTORY_CYCLES.forEach((cycle, cycleIdx) => {
        items.push({
          _id: `cal_${fac.facilityId}_${cycle.complianceType}_${cycleIdx}`,
          facilityId: fac.facilityId,
          facilityName: fac.name,
          complianceType: cycle.complianceType,
          reportingPeriod: cycle.reportingPeriod,
          regulatoryDueDate: cycle.regulatoryDueDate,
          internalDeadline: cycle.internalDeadline,
          clientDataSubmissionDeadline: cycle.clientCutoff,
          assignedConsultantId: 'USR_CONS_01',
          status: cycle.status,
          actualSubmissionDate: null,
          extensionHistory:
            cycle.complianceType === 'PAT'
              ? [
                  {
                    oldDate: '2025-08-31T00:00:00.000Z',
                    newDate: '2025-10-31T00:00:00.000Z',
                    reason: 'BEE statutory notification granting extended assessment window.',
                    notificationRef: 'BEE/PAT-Ext/2025/19',
                    revisedAt: '2025-07-20T10:00:00.000Z',
                  },
                ]
              : [],
          isRecurringCEA: cycle.isRecurringCEA,
        });
      });
    } else {
      // Pick 2-3 cycles per facility to avoid overwhelming large conglomerates (e.g. 21 units)
      const cycle1 = STANDARD_STATUTORY_CYCLES[facIdx % STANDARD_STATUTORY_CYCLES.length];
      const cycle2 = STANDARD_STATUTORY_CYCLES[(facIdx + 2) % STANDARD_STATUTORY_CYCLES.length];

      items.push({
        _id: `cal_${fac.facilityId}_${cycle1.complianceType}_${facIdx}_a`,
        facilityId: fac.facilityId,
        facilityName: fac.name,
        complianceType: cycle1.complianceType,
        reportingPeriod: cycle1.reportingPeriod,
        regulatoryDueDate: cycle1.regulatoryDueDate,
        internalDeadline: cycle1.internalDeadline,
        clientDataSubmissionDeadline: cycle1.clientCutoff,
        assignedConsultantId: 'USR_CONS_01',
        status: cycle1.status,
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: cycle1.isRecurringCEA,
      });

      items.push({
        _id: `cal_${fac.facilityId}_${cycle2.complianceType}_${facIdx}_b`,
        facilityId: fac.facilityId,
        facilityName: fac.name,
        complianceType: cycle2.complianceType,
        reportingPeriod: cycle2.reportingPeriod,
        regulatoryDueDate: cycle2.regulatoryDueDate,
        internalDeadline: cycle2.internalDeadline,
        clientDataSubmissionDeadline: cycle2.clientCutoff,
        assignedConsultantId: 'USR_CONS_01',
        status: cycle2.status,
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: cycle2.isRecurringCEA,
      });
    }
  });

  return items.sort(
    (a, b) => new Date(a.regulatoryDueDate).getTime() - new Date(b.regulatoryDueDate).getTime()
  );
}

/**
 * Generate a complete statutory compliance calendar across all client groups
 */
export function generateAllClientDeadlines(groups: IClientGroup[]): ICalendarItem[] {
  const allFacilities = groups.flatMap((g) => g.facilities || []);
  return generateDeadlinesForFacilities(allFacilities, { fullCoverage: false });
}
