import {
  DraftStatus,
  EligibilityStatus,
  Variant,
  type CandidateMatch,
  type EmailDraft,
  type JobPosting,
  type OpportunityDrafts,
} from './types'

export const OPT_OUT_LINE = `If you'd rather not hear from us again, reply "opt out" and we will stop.`
export const SENDER_PLACEHOLDER = '[Sender name, company, postal address]'
export const NO_VERIFIED_CANDIDATE_REASON = 'No verified candidate; not generated'
export const MAX_DRAFT_WORDS = 120

const BANNED_PHRASES: RegExp[] = [
  /struggling/i,
  /can'?t fill/i,
  /cannot fill/i,
  /having trouble/i,
  /hard to (hire|fill)/i,
  /difficulty (hiring|filling)/i,
  /exclusive/i,
  /guarantee/i,
  /years of experience/i,
  /years' experience/i,
]

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

const assemble = (paragraphs: string[]): string => [...paragraphs, OPT_OUT_LINE, SENDER_PLACEHOLDER].join('\n\n')

function availabilitySentence(match: CandidateMatch): string {
  const claims = [match.availableNow ? 'available now' : '', match.usHoursAvailable ? 'able to work U.S. hours' : '']
  const stated = claims.filter(Boolean)
  return stated.length === 0 ? '' : ` The profile is listed as ${stated.join(' and ')}.`
}

function buildVariantA(job: JobPosting, match: CandidateMatch, status: DraftStatus): EmailDraft {
  return {
    variant: Variant.A,
    status,
    subject: `Candidate ${match.candidateId} for your ${job.title} role`,
    body: assemble([
      'Hello,',
      `I noticed ${job.company} has an open ${job.title} role. We have a candidate profile that may fit: reference ${match.candidateId}, ${match.roleSpecialty}, with listed skills in ${match.matchedSkills.join(', ')}.${availabilitySentence(match)}`,
      'If useful, I can send the profile for your review. Would a short call this week work?',
    ]),
  }
}

function buildVariantB(job: JobPosting, status: DraftStatus): EmailDraft {
  return {
    variant: Variant.B,
    status,
    subject: `A shorter hiring process for your ${job.title} role`,
    body: assemble([
      'Hello,',
      `I noticed ${job.company} has an open ${job.title} role. We help teams move through hiring quickly: you share the requirements, and we propose remote candidates matched to them for you to review, so your time goes to interviews rather than sourcing.`,
      'Would a short call this week be useful to walk through how it works?',
    ]),
  }
}

export function buildDrafts(
  job: JobPosting,
  eligibilityStatus: EligibilityStatus,
  bestMatch: CandidateMatch | null,
): OpportunityDrafts | null {
  if (eligibilityStatus === EligibilityStatus.Ineligible) return null
  const status =
    eligibilityStatus === EligibilityStatus.Eligible ? DraftStatus.Ready : DraftStatus.HeldPendingVerification
  const verifiedMatch = bestMatch?.verified ? bestMatch : null
  return {
    A: verifiedMatch ? buildVariantA(job, verifiedMatch, status) : null,
    aNotGeneratedReason: verifiedMatch ? null : NO_VERIFIED_CANDIDATE_REASON,
    B: buildVariantB(job, status),
  }
}

export function lintDraft(draft: EmailDraft): string[] {
  const text = `${draft.subject}\n${draft.body}`
  const bannedHits = BANNED_PHRASES.filter((pattern) => pattern.test(text)).map(
    (pattern) => `Banned phrase: ${pattern.source}`,
  )
  const structuralIssues = [
    ...(draft.subject.trim() ? [] : ['Missing subject']),
    ...(draft.body.includes(SENDER_PLACEHOLDER) ? [] : ['Missing sender placeholder']),
    ...(/opt out/i.test(draft.body) ? [] : ['Missing opt-out line']),
    ...(wordCount(draft.body) <= MAX_DRAFT_WORDS ? [] : [`Longer than ${MAX_DRAFT_WORDS} words`]),
  ]
  return [...bannedHits, ...structuralIssues]
}
