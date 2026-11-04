import { describe, expect, it } from 'vitest'
import { analyzeOpportunities, EligibilityStatus, SCORING_CONFIG, DEMAND_CAVEAT, YesNo } from '../src'
import { candidatesImport, findOpportunity, jobsImport, opportunities } from './dataset'

const allMatches = opportunities.flatMap((opportunity) =>
  (opportunity.matches ?? []).map((match) => ({ opportunity, match })),
)

describe('candidate matching', () => {
  it('never verifies C-005 (not available now) and states the gap', () => {
    const c005 = allMatches.filter(({ match }) => match.candidateId === 'C-005')
    expect(c005.length).toBeGreaterThan(0)
    for (const { match } of c005) {
      expect(match.verified).toBe(false)
      expect(match.gaps).toContain('Not available now')
    }
  })

  it('never verifies C-009 for bookkeeper roles (missing reconciliation, no U.S. hours)', () => {
    const c009 = allMatches.filter(({ match, opportunity }) => match.candidateId === 'C-009' && opportunity.display.title === 'Bookkeeper')
    expect(c009.length).toBeGreaterThan(0)
    for (const { match } of c009) {
      expect(match.verified).toBe(false)
      expect(match.missingSkills).toContain('reconciliation')
      expect(match.gaps).toContain('Cannot work U.S. hours')
    }
  })

  it('never verifies C-010 (missing CRM)', () => {
    for (const { match } of allMatches.filter(({ match }) => match.candidateId === 'C-010')) {
      expect(match.verified).toBe(false)
    }
  })

  it('gives every eligible opportunity a verified best match', () => {
    const eligible = opportunities.filter((opportunity) => opportunity.eligibility.status === EligibilityStatus.Eligible)
    expect(eligible).toHaveLength(10)
    for (const opportunity of eligible) expect(opportunity.bestMatch?.verified, opportunity.id).toBe(true)
  })

  it('keeps unknown-hours matches verified but with a "Confirm working hours" note', () => {
    const best = findOpportunity('JOB-001').bestMatch
    expect(best?.candidateId).toBe('C-001')
    expect(best?.verified).toBe(true)
    expect(best?.notes).toContain('Confirm working hours')
  })

  it('flags a candidate proposed to several leads', () => {
    for (const id of ['JOB-001', 'JOB-011', 'JOB-021']) {
      expect(findOpportunity(id).bestMatch?.candidateId).toBe('C-001')
      expect(findOpportunity(id).proposedToLeads).toBe(3)
    }
  })

  it('labels every match synthetic and skips ineligible roles', () => {
    for (const { match } of allMatches) expect(match.synthetic).toBe(true)
    const ineligible = opportunities.filter((opportunity) => opportunity.eligibility.status === EligibilityStatus.Ineligible)
    for (const opportunity of ineligible) {
      expect(opportunity.matches).toBeNull()
      expect(opportunity.matchNote).toBe('Not matched: ineligible')
    }
  })

  it('records an unavailable best candidate as unverified when nobody qualifies (JOB-005)', () => {
    const best = findOpportunity('JOB-005').bestMatch
    expect(best?.candidateId).toBe('C-005')
    expect(best?.verified).toBe(false)
  })
})

describe('priority score', () => {
  const config = SCORING_CONFIG
  const scored = opportunities.filter((opportunity) => opportunity.score)

  it('has component maxima that sum to 100', () => {
    const total = config.remoteEligibility.max + config.candidateFit.max + config.demandSignals.max + config.commercialValue.max
    expect(total).toBe(100)
  })

  it('scores only eligible and needs_verification opportunities, within bounds and component maxima', () => {
    expect(scored).toHaveLength(18)
    for (const { score, id } of scored) {
      expect(score?.total, id).toBeGreaterThanOrEqual(0)
      expect(score?.total, id).toBeLessThanOrEqual(100)
      for (const component of Object.values(score?.components ?? {})) {
        expect(component.points).toBeLessThanOrEqual(component.max)
        expect(component.reasons.length).toBeGreaterThan(0)
      }
    }
  })

  it('leaves ineligible opportunities unscored with a reason', () => {
    const jobNine = findOpportunity('JOB-009')
    expect(jobNine.score).toBeNull()
    expect(jobNine.notScoredReason).toBe('Not scored: U.S.-only role')
  })

  it('flags needs_verification scores as provisional with reduced eligibility points', () => {
    for (const opportunity of scored) {
      const isHeld = opportunity.eligibility.status === EligibilityStatus.NeedsVerification
      expect(opportunity.score?.provisional).toBe(isHeld)
      expect(opportunity.score?.components.remoteEligibility.points).toBe(isHeld ? 10 : 25)
    }
  })

  it('attaches the demand caveat to every demand reason', () => {
    for (const { score } of scored) {
      for (const reason of score?.components.demandSignals.reasons ?? []) expect(reason).toContain(DEMAND_CAVEAT)
    }
  })

  it('computes a known score by hand (JOB-001: 25 + 35 + 0 + 11)', () => {
    // fit: 3/3*25=25 + available 5 + unknown hours 3 = 33; demand: 0 repost, no dup, posted 2d -> 4; commercial: 45k -> 4, hours unknown 0, no manager 0
    const score = findOpportunity('JOB-001').score
    expect(score?.components.candidateFit.points).toBe(33)
    expect(score?.components.demandSignals.points).toBe(4)
    expect(score?.components.commercialValue.points).toBe(4)
    expect(score?.total).toBe(25 + 33 + 4 + 4)
  })

  it('is deterministic', () => {
    expect(analyzeOpportunities(jobsImport.records, candidatesImport.records)).toEqual(opportunities)
  })

  it('reports an empty candidate pool explicitly', () => {
    const result = analyzeOpportunities(jobsImport.records, [])
    const reasons = result.find((opportunity) => opportunity.id === 'JOB-001')?.score?.components.candidateFit
    expect(reasons?.points).toBe(0)
    expect(reasons?.reasons).toEqual(['No candidate in pool for this role'])
  })
})

describe('unknown-hours edge case', () => {
  it('stays verified but carries both the confirm note and the explicit U.S.-hours gap', () => {
    const [job] = jobsImport.records.filter((entry) => entry.postingId === 'JOB-001')
    const noUsHours = { ...candidatesImport.records[0]!, usHoursAvailable: YesNo.No }
    const [result] = analyzeOpportunities(job ? [job] : [], [noUsHours])
    expect(result?.bestMatch?.verified).toBe(true)
    expect(result?.bestMatch?.notes).toContain('Confirm working hours')
    expect(result?.bestMatch?.gaps).toContain('Cannot work U.S. hours')
  })
})
