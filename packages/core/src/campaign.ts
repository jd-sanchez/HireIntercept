import { ratio } from './math'
import { matchCandidates } from './matching'
import { indexPostings } from './posting-index'
import {
  EligibilityStatus,
  EventType,
  Variant,
  type CampaignEvent,
  type Candidate,
  type Opportunity,
} from './types'

export enum CampaignScope {
  All = 'all',
  Eligible = 'eligible',
}

export enum WarningType {
  SendToIneligible = 'send_to_ineligible',
  SendToNeedsVerification = 'send_to_needs_verification',
  VariantAWithoutVerifiedCandidate = 'variant_a_without_verified_candidate',
  FollowUpToIneligible = 'follow_up_to_ineligible',
}

export interface CampaignMetrics {
  messagesSent: number
  uniqueContacts: number
  delivered: number
  rawOpens: number
  uniqueOpens: number
  bounces: number
  positiveReplies: number
  negativeReplies: number
  unsubscribes: number
  meetingsBooked: number
  clientsWon: number
  /** unique opens / delivered; always approximate. */
  openRate: number | null
  openRateIsApproximate: true
}

export interface CampaignWarning {
  type: WarningType
  postingIds: string[]
  message: string
}

export interface CampaignReport {
  scope: CampaignScope
  metrics: Record<Variant, CampaignMetrics> & { overall: CampaignMetrics }
  sampleSize: {
    contactsPerArm: Record<Variant, number>
    winnerDeclared: false
    message: string
  }
  warnings: CampaignWarning[]
  insight: string | null
  notes: string[]
}

export const MIN_CONTACTS_PER_ARM_FOR_WINNER = 100
const REPLY_EVENTS = new Set([EventType.RepliedPositive, EventType.RepliedNegative])

function computeMetrics(events: CampaignEvent[], contactKeyOf: (event: CampaignEvent) => string): CampaignMetrics {
  const counts = new Map<EventType, number>()
  const sentContacts = new Set<string>()
  const uniqueOpenKeys = new Set<string>()
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1)
    const contactKey = contactKeyOf(event)
    if (event.eventType === EventType.Sent) sentContacts.add(contactKey)
    if (event.eventType === EventType.Opened) uniqueOpenKeys.add(`${contactKey}|${event.step}`)
  }
  const countOf = (type: EventType) => counts.get(type) ?? 0
  const delivered = countOf(EventType.Delivered)
  return {
    messagesSent: countOf(EventType.Sent),
    uniqueContacts: sentContacts.size,
    delivered,
    rawOpens: countOf(EventType.Opened),
    uniqueOpens: uniqueOpenKeys.size,
    bounces: countOf(EventType.Bounced),
    positiveReplies: countOf(EventType.RepliedPositive),
    negativeReplies: countOf(EventType.RepliedNegative),
    unsubscribes: countOf(EventType.Unsubscribed),
    meetingsBooked: countOf(EventType.MeetingBooked),
    clientsWon: countOf(EventType.ClientWon),
    openRate: delivered === 0 ? null : ratio(uniqueOpenKeys.size, delivered),
    openRateIsApproximate: true,
  }
}

function buildWarnings(
  events: CampaignEvent[],
  opportunityByPosting: Map<string, Opportunity>,
  candidates: Candidate[],
): CampaignWarning[] {
  const hasVerifiedCandidate = (opportunity: Opportunity) =>
    matchCandidates(opportunity.display, candidates).some((match) => match.verified)

  const ineligibleSends = new Set<string>()
  const unverifiedSends = new Set<string>()
  const variantAWithoutCandidate = new Set<string>()
  const followUpsToIneligible = new Set<string>()

  for (const event of events) {
    const opportunity = opportunityByPosting.get(event.postingId)
    if (event.eventType !== EventType.Sent || !opportunity) continue
    const status = opportunity.eligibility.status
    if (status === EligibilityStatus.Ineligible) ineligibleSends.add(event.postingId)
    if (status === EligibilityStatus.NeedsVerification) unverifiedSends.add(event.postingId)
    if (event.variant === Variant.A && !hasVerifiedCandidate(opportunity)) variantAWithoutCandidate.add(event.postingId)
    if (event.step >= 2 && status === EligibilityStatus.Ineligible) followUpsToIneligible.add(event.postingId)
  }

  const checks: { type: WarningType; ids: Set<string>; message: string }[] = [
    { type: WarningType.SendToIneligible, ids: ineligibleSends, message: 'Messages were sent to ineligible postings' },
    { type: WarningType.SendToNeedsVerification, ids: unverifiedSends, message: 'Messages were sent before remote eligibility was verified' },
    { type: WarningType.VariantAWithoutVerifiedCandidate, ids: variantAWithoutCandidate, message: 'Variant A (candidate-first) was sent with no verified candidate' },
    { type: WarningType.FollowUpToIneligible, ids: followUpsToIneligible, message: 'A follow-up was sent to an ineligible contact' },
  ]
  return checks
    .filter((entry) => entry.ids.size > 0)
    .map((entry) => ({ type: entry.type, postingIds: [...entry.ids].sort(), message: entry.message }))
}

function buildInsight(events: CampaignEvent[], opportunityByPosting: Map<string, Opportunity>): string | null {
  const positives = events.filter((event) => event.eventType === EventType.RepliedPositive)
  if (positives.length === 0) return null
  const fromUnservable = positives.filter(
    (event) => opportunityByPosting.get(event.postingId)?.eligibility.status !== EligibilityStatus.Eligible,
  ).length
  return `${fromUnservable} of ${positives.length} positive replies came from ineligible or unverified jobs`
}

function buildNotes(events: CampaignEvent[], unknownPostingIds: string[]): string[] {
  const opened = new Set(events.filter((event) => event.eventType === EventType.Opened).map((event) => event.postingId))
  const repliedWithoutOpen = [
    ...new Set(events.filter((event) => REPLY_EVENTS.has(event.eventType) && !opened.has(event.postingId)).map((event) => event.postingId)),
  ].sort()
  return [
    'Contact identity: no email addresses in the data, so a company\'s domain stands in for the contact (one decision-maker per company).',
    'Open rate is approximate: unique opens (distinct contact + step) divided by delivered.',
    ...repliedWithoutOpen.map((postingId) => `${postingId} replied with no recorded open; opens are not inferred from replies.`),
    ...(unknownPostingIds.length > 0 ? [`Events for unknown postings were ignored: ${unknownPostingIds.join(', ')}.`] : []),
  ]
}

export function buildCampaignReport(
  events: CampaignEvent[],
  opportunities: Opportunity[],
  candidates: Candidate[],
  scope: CampaignScope,
): CampaignReport {
  const { opportunityByPosting, contactKeyByPosting } = indexPostings(opportunities)
  const knownEvents = events.filter((event) => opportunityByPosting.has(event.postingId))
  const unknownPostingIds = [...new Set(events.filter((event) => !opportunityByPosting.has(event.postingId)).map((event) => event.postingId))].sort()
  const scopedEvents =
    scope === CampaignScope.All
      ? knownEvents
      : knownEvents.filter((event) => opportunityByPosting.get(event.postingId)?.eligibility.status === EligibilityStatus.Eligible)

  const contactKeyOf = (event: CampaignEvent) => contactKeyByPosting.get(event.postingId) ?? event.postingId
  const metricsA = computeMetrics(scopedEvents.filter((event) => event.variant === Variant.A), contactKeyOf)
  const metricsB = computeMetrics(scopedEvents.filter((event) => event.variant === Variant.B), contactKeyOf)
  const smallestArm = Math.min(metricsA.uniqueContacts, metricsB.uniqueContacts)

  return {
    scope,
    metrics: { [Variant.A]: metricsA, [Variant.B]: metricsB, overall: computeMetrics(scopedEvents, contactKeyOf) },
    sampleSize: {
      contactsPerArm: { [Variant.A]: metricsA.uniqueContacts, [Variant.B]: metricsB.uniqueContacts },
      winnerDeclared: false,
      message:
        smallestArm < MIN_CONTACTS_PER_ARM_FOR_WINNER
          ? 'Sample too small to declare a winner'
          : 'Significance testing is not implemented; no winner declared',
    },
    warnings: buildWarnings(knownEvents, opportunityByPosting, candidates),
    insight: buildInsight(knownEvents, opportunityByPosting),
    notes: buildNotes(knownEvents, unknownPostingIds),
  }
}
