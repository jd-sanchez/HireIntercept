import { fileURLToPath } from 'node:url'
import {
  analyzeOpportunities,
  candidateRowSchema,
  eventRowSchema,
  jobRowSchema,
  loadCsvFile,
  type Opportunity,
} from '../src'

const dataFile = (name: string) => fileURLToPath(new URL(`../../../data/hireintercept_sample_${name}.csv`, import.meta.url))

export const jobsImport = loadCsvFile(dataFile('jobs'), jobRowSchema)
export const candidatesImport = loadCsvFile(dataFile('candidates'), candidateRowSchema)
export const eventsImport = loadCsvFile(dataFile('events'), eventRowSchema)

export const opportunities = analyzeOpportunities(jobsImport.records, candidatesImport.records)

export const findOpportunity = (postingId: string): Opportunity => {
  const found = opportunities.find((opportunity) => opportunity.sourcePostingIds.includes(postingId))
  if (!found) throw new Error(`No opportunity for ${postingId}`)
  return found
}

export const idsWithStatus = (status: string): string[] =>
  opportunities.filter((opportunity) => opportunity.eligibility.status === status).map((opportunity) => opportunity.id)
