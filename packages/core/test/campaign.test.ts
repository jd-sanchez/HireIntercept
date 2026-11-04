import { describe, expect, it } from 'vitest'
import { buildCampaignReport, CampaignScope, WarningType, type CampaignMetrics } from '../src'
import { candidatesImport, eventsImport, opportunities } from './dataset'

const pick = (metrics: CampaignMetrics) => ({
  sent: metrics.messagesSent,
  delivered: metrics.delivered,
  uniqueOpens: metrics.uniqueOpens,
  bounces: metrics.bounces,
  positive: metrics.positiveReplies,
  negative: metrics.negativeReplies,
  unsubscribes: metrics.unsubscribes,
  meetings: metrics.meetingsBooked,
  won: metrics.clientsWon,
})

const all = buildCampaignReport(eventsImport.records, opportunities, candidatesImport.records, CampaignScope.All)
const eligible = buildCampaignReport(eventsImport.records, opportunities, candidatesImport.records, CampaignScope.Eligible)

describe('campaign metrics, scope=all', () => {
  it('matches the golden numbers for A, B and overall', () => {
    expect(pick(all.metrics.A)).toEqual({ sent: 13, delivered: 12, uniqueOpens: 8, bounces: 1, positive: 3, negative: 1, unsubscribes: 1, meetings: 1, won: 1 })
    expect(pick(all.metrics.B)).toEqual({ sent: 13, delivered: 12, uniqueOpens: 7, bounces: 1, positive: 1, negative: 1, unsubscribes: 1, meetings: 1, won: 0 })
    expect(pick(all.metrics.overall)).toEqual({ sent: 26, delivered: 24, uniqueOpens: 15, bounces: 2, positive: 4, negative: 2, unsubscribes: 2, meetings: 2, won: 1 })
  })

  it('does not let duplicate opens inflate unique opens', () => {
    expect([all.metrics.A.rawOpens, all.metrics.B.rawOpens, all.metrics.overall.rawOpens]).toEqual([10, 7, 17])
  })

  it('labels the open rate approximate', () => {
    expect(all.metrics.overall.openRateIsApproximate).toBe(true)
    expect(all.metrics.overall.openRate).toBeCloseTo(15 / 24, 5)
  })
})

describe('campaign metrics, scope=eligible', () => {
  it('matches the golden numbers for A, B and overall', () => {
    expect(pick(eligible.metrics.A)).toMatchObject({ sent: 3, delivered: 2, uniqueOpens: 2, bounces: 1, positive: 1, negative: 1, meetings: 1, won: 1 })
    expect(pick(eligible.metrics.B)).toMatchObject({ sent: 5, delivered: 4, uniqueOpens: 4, bounces: 1, positive: 0, negative: 1, meetings: 0, won: 0 })
    expect(pick(eligible.metrics.overall)).toMatchObject({ sent: 8, delivered: 6, uniqueOpens: 6, bounces: 2, positive: 1, negative: 2, meetings: 1, won: 1 })
  })
})

describe('sample size, warnings, notes', () => {
  it('declares no winner on a small sample', () => {
    expect(all.sampleSize.winnerDeclared).toBe(false)
    expect(all.sampleSize.message).toBe('Sample too small to declare a winner')
  })

  it('computes data-integrity warnings from the data', () => {
    const idsFor = (type: WarningType) => all.warnings.find((warning) => warning.type === type)?.postingIds
    expect(idsFor(WarningType.SendToIneligible)).toEqual(['JOB-003', 'JOB-007', 'JOB-009', 'JOB-010', 'JOB-013', 'JOB-017', 'JOB-019', 'JOB-020', 'JOB-023'])
    expect(idsFor(WarningType.SendToNeedsVerification)).toEqual(['JOB-004', 'JOB-005', 'JOB-006', 'JOB-012', 'JOB-015', 'JOB-018', 'JOB-024'])
    expect(idsFor(WarningType.VariantAWithoutVerifiedCandidate)).toEqual(['JOB-005', 'JOB-009', 'JOB-015', 'JOB-019'])
    expect(idsFor(WarningType.FollowUpToIneligible)).toEqual(['JOB-009'])
  })

  it('computes the insight and the no-inferred-open note', () => {
    expect(all.insight).toBe('3 of 4 positive replies came from ineligible or unverified leads')
    expect(all.notes.some((note) => note.includes('JOB-012 replied with no recorded open'))).toBe(true)
    expect(all.notes.some((note) => note.includes('contact_key is the posting domain'))).toBe(true)
  })
})
