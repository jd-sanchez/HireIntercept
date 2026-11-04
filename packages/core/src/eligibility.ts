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

export function assessPosting(job: JobPosting): PostingEligibility {
  const verdict = (status: EligibilityStatus, code: EligibilityCode, reason: string): PostingEligibility => ({
    postingId: job.postingId,
    status,
    code,
    reason,
  })

  if (job.remotePolicy === RemotePolicy.Onsite)
    return verdict(EligibilityStatus.Ineligible, EligibilityCode.Onsite, 'On-site role')
  if (job.remotePolicy === RemotePolicy.UsOnly)
    return verdict(EligibilityStatus.Ineligible, EligibilityCode.UsOnly, 'U.S.-only role')
  if (LICENSE_PATTERN.test(`${job.title} ${job.requiredSkills.join(' ')}`))
    return verdict(EligibilityStatus.Ineligible, EligibilityCode.LicenseRequired, 'Requires local license')
  if (job.remotePolicy === RemotePolicy.RemoteUnspecified)
    return verdict(EligibilityStatus.NeedsVerification, EligibilityCode.RemoteUnspecified, 'Remote eligibility not stated')
  if (RESTRICTION_PATTERN.test(job.notes))
    return verdict(
      EligibilityStatus.NeedsVerification,
      EligibilityCode.PossibleLocalRestriction,
      'Note mentions possible local restriction',
    )
  return verdict(EligibilityStatus.Eligible, EligibilityCode.GlobalRemote, 'Global remote role')
}
