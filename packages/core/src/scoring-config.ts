export const SCORING_CONFIG = {
  remoteEligibility: { max: 25, eligible: 25, needsVerification: 10 },
  candidateFit: { max: 35, coverageMax: 25, availableNow: 5, usHoursCompatible: 5, usHoursUnknown: 3 },
  demandSignals: {
    max: 25,
    urgentStart: 8,
    perRepost: 3,
    repostCap: 3,
    linkedDuplicate: 4,
    recentPosting: 4,
    recentWithinDays: 14,
  },
  commercialValue: {
    max: 15,
    salaryTiers: [
      { minSalary: 70000, points: 10 },
      { minSalary: 55000, points: 7 },
    ],
    salaryFloorPoints: 4,
    usHoursKnown: 3,
    hiringManagerListed: 2,
  },
} as const

export const DEMAND_CAVEAT = 'a signal of possible ongoing need, not evidence of hiring difficulty'
