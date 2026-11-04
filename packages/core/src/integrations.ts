import type { CampaignEvent, Candidate, EmailDraft, ImportResult, JobPosting, Variant } from './types'

/** Where Apollo company/job sourcing would plug in. */
export interface ProspectSource {
  fetchJobPostings(): Promise<ImportResult<JobPosting>>
}

/** Where the Finally Staff candidate supply would plug in. */
export interface CandidateProvider {
  fetchCandidates(): Promise<ImportResult<Candidate>>
}

/** Where Apollo webhook / activity ingestion would plug in. */
export interface EventIngestor {
  fetchEvents(): Promise<ImportResult<CampaignEvent>>
}

export interface OutreachRequest {
  contactKey: string
  postingId: string
  variant: Variant
  draft: EmailDraft
}

export interface OutreachReceipt extends OutreachRequest {
  status: 'would_send'
}

/** Where Apollo sequence sending would plug in. */
export interface OutreachSender {
  send(request: OutreachRequest): Promise<OutreachReceipt>
}

/** Records what would be sent; never sends anything. */
export class NoopSender implements OutreachSender {
  readonly recorded: OutreachReceipt[] = []

  async send(request: OutreachRequest): Promise<OutreachReceipt> {
    const receipt: OutreachReceipt = { ...request, status: 'would_send' }
    this.recorded.push(receipt)
    return receipt
  }
}
