import { normalizeText, type EligibilityStatus, type Opportunity, type OpportunityListItem } from '@hireintercept/core'
import { OpportunitySort } from './queries'

export interface OpportunityFilters {
  industry?: string
  role?: string
  status?: EligibilityStatus
  minScore?: number
  sort?: OpportunitySort
}

export const toListItem = (opportunity: Opportunity): OpportunityListItem => ({
  id: opportunity.id,
  sourcePostingIds: opportunity.sourcePostingIds,
  company: opportunity.display.company,
  role: opportunity.display.title,
  industry: opportunity.display.industry,
  status: opportunity.eligibility.status,
  statusReason: opportunity.eligibility.summary,
  score: opportunity.score?.total ?? null,
  provisional: opportunity.score?.provisional ?? false,
  notScoredReason: opportunity.notScoredReason,
  hasLinkedDuplicate: opportunity.hasLinkedDuplicate,
  bestCandidate: opportunity.bestMatch
    ? {
        candidateId: opportunity.bestMatch.candidateId,
        verified: opportunity.bestMatch.verified,
        confirmHours: opportunity.bestMatch.usHoursCompatible === null,
        gaps: opportunity.bestMatch.gaps,
        coveragePercent: opportunity.bestMatch.coveragePercent,
        proposedToLeads: opportunity.proposedToLeads,
      }
    : null,
})

const byCompany = (left: OpportunityListItem, right: OpportunityListItem): number => left.company.localeCompare(right.company)

const byScoreDescending = (left: OpportunityListItem, right: OpportunityListItem): number =>
  (right.score ?? -1) - (left.score ?? -1) || byCompany(left, right)

export function listOpportunities(opportunities: Opportunity[], filters: OpportunityFilters): OpportunityListItem[] {
  const { industry, role, status, minScore, sort = OpportunitySort.Score } = filters
  return opportunities
    .map(toListItem)
    .filter(
      (item) =>
        (industry === undefined || normalizeText(item.industry) === normalizeText(industry)) &&
        (role === undefined || normalizeText(item.role) === normalizeText(role)) &&
        (status === undefined || item.status === status) &&
        (minScore === undefined || (item.score !== null && item.score >= minScore)),
    )
    .sort(sort === OpportunitySort.Company ? byCompany : byScoreDescending)
}
