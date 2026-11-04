import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify'
import type { z } from 'zod'
import { CampaignScope, EligibilityStatus, type FilterOptions, type ImportFileSummary, type ImportResult, type ImportSummary, type Opportunity } from '@hireintercept/core'
import type { Dataset } from './dataset'
import { listOpportunities } from './opportunity-views'
import { campaignQuery, opportunitiesQuery } from './queries'

function parseQuery<Schema extends z.ZodType>(schema: Schema, query: unknown, reply: FastifyReply): z.infer<Schema> | null {
  const parsed = schema.safeParse(query)
  if (parsed.success) return parsed.data
  const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  reply.code(400).send({ error: message })
  return null
}

const sortedDistinct = (values: string[]): string[] => [...new Set(values)].sort((left, right) => left.localeCompare(right))

function buildImportSummary(dataset: Dataset): ImportSummary {
  const summarize = (result: ImportResult<unknown>): ImportFileSummary => ({
    totalRows: result.totalRows,
    validRows: result.records.length,
    invalidRows: result.invalidRows,
  })
  const statusCounts: Record<EligibilityStatus, number> = { [EligibilityStatus.Eligible]: 0, [EligibilityStatus.NeedsVerification]: 0, [EligibilityStatus.Ineligible]: 0 }
  for (const opportunity of dataset.opportunities) statusCounts[opportunity.eligibility.status] += 1

  return {
    files: { jobs: summarize(dataset.jobs), candidates: summarize(dataset.candidates), events: summarize(dataset.events) },
    canonicalOpportunities: dataset.opportunities.length,
    eligibilityCounts: statusCounts,
    duplicateGroups: dataset.opportunities
      .filter((opportunity) => opportunity.hasLinkedDuplicate)
      .map((opportunity) => ({
        canonicalId: opportunity.id,
        sourcePostingIds: opportunity.sourcePostingIds,
        key: { domain: opportunity.display.domain, title: opportunity.display.title },
        mergedStatus: opportunity.eligibility.status,
        statusReasons: opportunity.eligibility.reasons,
        displayPostingId: opportunity.display.postingId,
        repostCount: opportunity.repostCount,
        fieldConflicts: opportunity.fieldConflicts,
        mergeRules: [
          'Eligibility: most restrictive status across all postings',
          'Display fields: most recent posting (fewest days since posted, ties by lowest posting ID)',
          'Repost signal: highest repost count in the group',
        ],
      })),
  }
}

export function buildApp(dataset: Dataset, logger = false): FastifyInstance {
  const app = Fastify({ logger })
  const findOpportunity = (id: string): Opportunity | undefined =>
    dataset.opportunities.find((opportunity) => opportunity.sourcePostingIds.includes(id))
  const importSummary = buildImportSummary(dataset)
  const filters: FilterOptions = {
    industries: sortedDistinct(dataset.opportunities.map((opportunity) => opportunity.display.industry)),
    roles: sortedDistinct(dataset.opportunities.map((opportunity) => opportunity.display.title)),
  }

  app.get('/api/opportunities', async (request, reply) => {
    const query = parseQuery(opportunitiesQuery, request.query, reply)
    return query ? listOpportunities(dataset.opportunities, query) : reply
  })

  app.get<{ Params: { id: string } }>('/api/opportunities/:id', async (request, reply) => {
    const opportunity = findOpportunity(request.params.id)
    return opportunity ?? reply.code(404).send({ error: `Opportunity ${request.params.id} not found` })
  })

  app.get('/api/import-summary', async () => importSummary)

  app.get('/api/campaign', async (request, reply) => {
    const query = parseQuery(campaignQuery, request.query, reply)
    return query ? dataset.campaignByScope[query.scope ?? CampaignScope.All] : reply
  })

  app.get('/api/sequences', async () => dataset.sequences)

  app.get('/api/filters', async () => filters)

  return app
}
