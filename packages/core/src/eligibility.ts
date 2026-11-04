import {
  EligibilityCode,
  EligibilityStatus,
  RemotePolicy,
  type JobPosting,
  type PostingEligibility,
} from './types'

const LICENSE_PATTERN = /licen[sc]e/i
const RESTRICTION_PATTERN = /restriction|unclear/i

const SEVERITY: Record<EligibilityStatus, number> = {
  [EligibilityStatus.Eligible]: 0,
  [EligibilityStatus.NeedsVerification]: 1,
  [EligibilityStatus.Ineligible]: 2,
}

export const mostRestrictive = (statuses: EligibilityStatus[]): EligibilityStatus =>
  statuses.reduce((worst, status) => (SEVERITY[status] > SEVERITY[worst] ? status : worst), EligibilityStatus.Eligible)

interface EligibilityRule {
  code: EligibilityCode
  status: EligibilityStatus
  reason: string
  applies: (job: JobPosting) => boolean
}

// Order matters: the first matching rule decides the status; later matches are only recorded.
const RULES: EligibilityRule[] = [
  { code: EligibilityCode.Onsite, status: EligibilityStatus.Ineligible, reason: 'On-site role', applies: (job) => job.remotePolicy === RemotePolicy.Onsite },
  { code: EligibilityCode.UsOnly, status: EligibilityStatus.Ineligible, reason: 'U.S.-only role', applies: (job) => job.remotePolicy === RemotePolicy.UsOnly },
  {
    code: EligibilityCode.LicenseRequired,
    status: EligibilityStatus.Ineligible,
    reason: 'Requires local license',
    applies: (job) => LICENSE_PATTERN.test(`${job.title} ${job.requiredSkills.join(' ')}`),
  },
  {
    code: EligibilityCode.RemoteUnspecified,
    status: EligibilityStatus.NeedsVerification,
    reason: 'Remote eligibility not stated',
    applies: (job) => job.remotePolicy === RemotePolicy.RemoteUnspecified,
  },
  {
    code: EligibilityCode.PossibleLocalRestriction,
    status: EligibilityStatus.NeedsVerification,
    reason: 'Note mentions possible local restriction',
    applies: (job) => RESTRICTION_PATTERN.test(job.notes),
  },
]

export function assessPosting(job: JobPosting): PostingEligibility {
  const [decisive, ...alsoApplied] = RULES.filter((rule) => rule.applies(job))
  return {
    postingId: job.postingId,
    status: decisive?.status ?? EligibilityStatus.Eligible,
    code: decisive?.code ?? EligibilityCode.GlobalRemote,
    reason: decisive?.reason ?? 'Global remote role',
    alsoReasons: alsoApplied.map((rule) => rule.reason),
  }
}
