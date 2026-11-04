import { dedupPostings } from './dedup'
import { buildDrafts } from './emails'
import { matchCandidates } from './matching'
import { scoreOpportunity } from './scoring'
import { EligibilityStatus, type Candidate, type JobPosting, type Opportunity } from './types'

export const NOT_MATCHED_NOTE = 'Not matched: ineligible'

export function analyzeOpportunities(jobs: JobPosting[], candidates: Candidate[]): Opportunity[] {
  const matched = dedupPostings(jobs).map((canonical) => {
    const isIneligible = canonical.eligibility.status === EligibilityStatus.Ineligible
    const matches = isIneligible ? null : matchCandidates(canonical.display, candidates)
    return { canonical, matches, bestMatch: matches?.[0] ?? null }
  })

  const proposalCounts = new Map<string, number>()
  for (const { bestMatch } of matched) {
    if (bestMatch?.verified) proposalCounts.set(bestMatch.candidateId, (proposalCounts.get(bestMatch.candidateId) ?? 0) + 1)
  }

  return matched.map(({ canonical, matches, bestMatch }) => {
    const score = scoreOpportunity(canonical, bestMatch)
    return {
      ...canonical,
      matches,
      matchNote: matches ? null : NOT_MATCHED_NOTE,
      bestMatch,
      proposedToLeads: bestMatch?.verified ? (proposalCounts.get(bestMatch.candidateId) ?? 0) : 0,
      score,
      notScoredReason: score ? null : `Not scored: ${canonical.eligibility.summary}`,
      drafts: buildDrafts(canonical.display, canonical.eligibility.status, bestMatch),
    }
  })
}
