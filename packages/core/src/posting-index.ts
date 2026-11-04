import { normalizeDomain } from './normalize'
import type { Opportunity } from './types'

/**
 * Contact identity: the data has no email addresses, so contact_key is the posting's normalized
 * domain (one decision-maker per company is assumed).
 */
export interface PostingIndex {
  opportunityByPosting: Map<string, Opportunity>
  contactKeyByPosting: Map<string, string>
}

export function indexPostings(opportunities: Opportunity[]): PostingIndex {
  const opportunityByPosting = new Map<string, Opportunity>()
  const contactKeyByPosting = new Map<string, string>()
  for (const opportunity of opportunities) {
    for (const postingId of opportunity.sourcePostingIds) {
      opportunityByPosting.set(postingId, opportunity)
      contactKeyByPosting.set(postingId, normalizeDomain(opportunity.display.domain))
    }
  }
  return { opportunityByPosting, contactKeyByPosting }
}
