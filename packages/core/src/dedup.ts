import { assessPosting, mostRestrictive } from './eligibility'
import { normalizeDomain, normalizeText } from './normalize'
import { UsHoursRequired, type FieldConflict, type JobPosting, type Opportunity } from './types'

export type CanonicalPosting = Pick<
  Opportunity,
  'id' | 'sourcePostingIds' | 'display' | 'eligibility' | 'repostCount' | 'hasLinkedDuplicate' | 'fieldConflicts'
>

const COMPARED_FIELDS: { field: string; read: (job: JobPosting) => string }[] = [
  { field: 'company', read: (job) => job.company },
  { field: 'industry', read: (job) => job.industry },
  { field: 'companyEmployees', read: (job) => String(job.companyEmployees) },
  { field: 'requiredSkills', read: (job) => job.requiredSkills.join(';') },
  { field: 'remotePolicy', read: (job) => job.remotePolicy },
  { field: 'usHoursRequired', read: (job) => job.usHoursRequired },
  { field: 'postedDaysAgo', read: (job) => String(job.postedDaysAgo) },
  { field: 'repostCount', read: (job) => String(job.repostCount) },
  { field: 'salaryUsdPerYear', read: (job) => String(job.salaryUsdPerYear) },
  { field: 'notes', read: (job) => job.notes },
]

export const dedupKey = (job: JobPosting): string => `${normalizeDomain(job.domain)}|${normalizeText(job.title)}`

const byPostingId = (left: JobPosting, right: JobPosting): number => left.postingId.localeCompare(right.postingId)

const byRecency = (left: JobPosting, right: JobPosting): number =>
  left.postedDaysAgo - right.postedDaysAgo || byPostingId(left, right)

function findConflicts(members: JobPosting[]): FieldConflict[] {
  return COMPARED_FIELDS.flatMap(({ field, read }) => {
    const values = members.map((job) => ({ postingId: job.postingId, value: read(job) }))
    const hasConflict = new Set(values.map((entry) => entry.value)).size > 1
    return hasConflict ? [{ field, values }] : []
  })
}

function mergeGroup(group: JobPosting[]): CanonicalPosting {
  const members = [...group].sort(byPostingId)
  const display = [...members].sort(byRecency)[0] as JobPosting
  const reasons = members.map(assessPosting)
  const status = mostRestrictive(reasons.map((reason) => reason.status))
  const decisive = reasons.find((reason) => reason.status === status) ?? (reasons[0] as (typeof reasons)[number])

  return {
    id: (members[0] as JobPosting).postingId,
    sourcePostingIds: members.map((job) => job.postingId),
    display,
    eligibility: {
      status,
      summary: decisive.reason,
      reasons,
      confirmWorkingHours: display.usHoursRequired === UsHoursRequired.Unknown,
    },
    repostCount: Math.max(...members.map((job) => job.repostCount)),
    hasLinkedDuplicate: members.length > 1,
    fieldConflicts: findConflicts(members),
  }
}

export function dedupPostings(jobs: JobPosting[]): CanonicalPosting[] {
  const groups = new Map<string, JobPosting[]>()
  for (const job of jobs) groups.set(dedupKey(job), [...(groups.get(dedupKey(job)) ?? []), job])
  return [...groups.values()].map(mergeGroup).sort((left, right) => left.id.localeCompare(right.id))
}
