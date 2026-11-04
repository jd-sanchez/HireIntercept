import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  analyzeOpportunities,
  buildCampaignReport,
  buildSequenceReport,
  CampaignScope,
  CsvCandidateProvider,
  CsvEventIngestor,
  CsvProspectSource,
  type CampaignEvent,
  type CampaignReport,
  type Candidate,
  type ImportResult,
  type JobPosting,
  type Opportunity,
  type SequenceReport,
} from '@hireintercept/core'

export interface Dataset {
  jobs: ImportResult<JobPosting>
  candidates: ImportResult<Candidate>
  events: ImportResult<CampaignEvent>
  opportunities: Opportunity[]
  campaignByScope: Record<CampaignScope, CampaignReport>
  sequences: SequenceReport
}

export const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../../data', import.meta.url))

export async function loadDataset(dataDir: string = DEFAULT_DATA_DIR): Promise<Dataset> {
  const [jobs, candidates, events] = await Promise.all([
    new CsvProspectSource(join(dataDir, 'hireintercept_sample_jobs.csv')).fetchJobPostings(),
    new CsvCandidateProvider(join(dataDir, 'hireintercept_sample_candidates.csv')).fetchCandidates(),
    new CsvEventIngestor(join(dataDir, 'hireintercept_sample_events.csv')).fetchEvents(),
  ])
  const opportunities = analyzeOpportunities(jobs.records, candidates.records)
  const campaignFor = (scope: CampaignScope) => buildCampaignReport(events.records, opportunities, candidates.records, scope)
  return {
    jobs,
    candidates,
    events,
    opportunities,
    campaignByScope: { [CampaignScope.All]: campaignFor(CampaignScope.All), [CampaignScope.Eligible]: campaignFor(CampaignScope.Eligible) },
    sequences: buildSequenceReport(events.records, opportunities),
  }
}
