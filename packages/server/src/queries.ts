import { z } from 'zod'
import { CampaignScope, EligibilityStatus } from '@hireintercept/core'

export enum OpportunitySort {
  Score = 'score',
  Company = 'company',
}

const optional = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

export const opportunitiesQuery = z.object({
  industry: optional(z.string()),
  role: optional(z.string()),
  status: optional(z.enum(EligibilityStatus)),
  minScore: optional(z.coerce.number().min(0).max(100)),
  sort: optional(z.enum(OpportunitySort)),
})

export const campaignQuery = z.object({
  scope: optional(z.enum(CampaignScope)),
})
