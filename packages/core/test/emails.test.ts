import { describe, expect, it } from 'vitest'
import { DraftStatus, EligibilityStatus, lintDraft, Variant, type EmailDraft } from '../src'
import { candidatesImport, findOpportunity, opportunities } from './dataset'

const withStatus = (status: EligibilityStatus) => opportunities.filter((opportunity) => opportunity.eligibility.status === status)
const allDrafts = opportunities.flatMap((opportunity) => [opportunity.drafts?.A, opportunity.drafts?.B]).filter((draft): draft is EmailDraft => Boolean(draft))

describe('email drafts', () => {
  it('generates no drafts for ineligible opportunities', () => {
    for (const opportunity of withStatus(EligibilityStatus.Ineligible)) expect(opportunity.drafts).toBeNull()
  })

  it('always generates Variant B for eligible and held opportunities', () => {
    for (const opportunity of [...withStatus(EligibilityStatus.Eligible), ...withStatus(EligibilityStatus.NeedsVerification)]) {
      expect(opportunity.drafts?.B.variant).toBe(Variant.B)
    }
  })

  it('generates Variant A only where a verified match exists', () => {
    for (const opportunity of opportunities.filter((entry) => entry.drafts)) {
      const hasVerified = opportunity.bestMatch?.verified === true
      expect(Boolean(opportunity.drafts?.A), opportunity.id).toBe(hasVerified)
      if (!hasVerified) expect(opportunity.drafts?.aNotGeneratedReason).toBe('No verified candidate; not generated')
    }
    for (const id of ['JOB-005', 'JOB-015']) expect(findOpportunity(id).drafts?.A).toBeNull()
  })

  it('holds drafts for needs_verification opportunities and marks eligible ones ready', () => {
    for (const opportunity of withStatus(EligibilityStatus.NeedsVerification)) {
      expect(opportunity.drafts?.B.status).toBe(DraftStatus.HeldPendingVerification)
    }
    for (const opportunity of withStatus(EligibilityStatus.Eligible)) expect(opportunity.drafts?.B.status).toBe(DraftStatus.Ready)
  })

  it('passes the claim linter for every draft', () => {
    expect(allDrafts.length).toBeGreaterThan(0)
    for (const draft of allDrafts) expect(lintDraft(draft), draft.subject).toEqual([])
  })

  it('refers to the candidate only by id, role and listed skills, and claims only what the data says', () => {
    const draftA = findOpportunity('JOB-001').drafts?.A
    expect(draftA?.body).toContain('C-001')
    expect(draftA?.body).toContain('Bookkeeper')
    expect(draftA?.body).toContain('QuickBooks, reconciliation, Excel')
    for (const opportunity of opportunities) {
      const draft = opportunity.drafts?.A
      const candidate = candidatesImport.records.find((entry) => entry.candidateId === opportunity.bestMatch?.candidateId)
      if (!draft || !candidate) continue
      expect(draft.body.includes('available now')).toBe(candidate.availableNow === 'yes')
      expect(draft.body.includes('U.S. hours')).toBe(candidate.usHoursAvailable === 'yes')
    }
  })
})

describe('claim linter', () => {
  const base: EmailDraft = { variant: Variant.B, status: DraftStatus.Ready, subject: 'Hi', body: '' }
  const clean = 'Hello.\n\nreply "opt out" any time.\n\n[Sender name, company, postal address]'

  it('accepts a clean draft', () => {
    expect(lintDraft({ ...base, body: clean })).toEqual([])
  })

  it.each(['struggling to hire', "can't fill this", 'having trouble', 'an exclusive offer', 'guaranteed results', '5 years of experience'])(
    'flags "%s"',
    (phrase) => {
      expect(lintDraft({ ...base, body: `${phrase}\n${clean}` }).length).toBeGreaterThan(0)
    },
  )

  it('flags a missing opt-out line, placeholder and over-long body', () => {
    expect(lintDraft({ ...base, body: 'Hello.' })).toEqual(expect.arrayContaining(['Missing sender placeholder', 'Missing opt-out line']))
    expect(lintDraft({ ...base, body: `${'word '.repeat(130)}\n${clean}` })).toContain('Longer than 120 words')
  })
})
