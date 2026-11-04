import { mostRestrictive } from './eligibility'
import { indexPostings } from './posting-index'
import { EligibilityStatus, EventType, type CampaignEvent, type Opportunity, type Variant } from './types'

export const FOLLOW_UP_SCHEDULE = [
  { step: 1, day: 1 },
  { step: 2, day: 4 },
  { step: 3, day: 8 },
  { step: 4, day: 15 },
] as const

export enum StepStatus {
  Sent = 'sent',
  Pending = 'pending',
  Cancelled = 'cancelled',
}

export enum ContactState {
  Active = 'active',
  Stopped = 'stopped',
  Suppressed = 'suppressed',
  Held = 'held',
}

export enum StopReason {
  RepliedPositive = 'replied_positive',
  RepliedNegative = 'replied_negative',
  Bounced = 'bounced',
  Unsubscribed = 'unsubscribed',
  IneligibleRole = 'ineligible_role',
}

export enum SuppressionScope {
  AllPostingsAtDomain = 'all_postings_at_domain',
  PermanentAllVariants = 'permanent_all_variants',
}

export interface SequenceStep {
  step: number
  scheduledDay: number
  status: StepStatus
  sentEventId: string | null
  violation: boolean
}

export interface SequenceViolation {
  eventId: string
  step: number
  day: number
  reason: string
}

export interface ContactSequence {
  contactKey: string
  postingIds: string[]
  variants: Variant[]
  state: ContactState
  stopReason: StopReason | null
  stopDay: number | null
  addressInvalid: boolean
  steps: SequenceStep[]
  violations: SequenceViolation[]
  meetingsBooked: number
  clientsWon: number
}

export interface SuppressionEntry {
  contactKey: string
  postingIds: string[]
  reason: StopReason
  day: number | null
  scope: SuppressionScope
}

export interface SequenceReport {
  asOfDay: number
  schedule: typeof FOLLOW_UP_SCHEDULE
  contacts: ContactSequence[]
  suppressionList: SuppressionEntry[]
}

const STOP_REASON_BY_EVENT = new Map<EventType, StopReason>([
  [EventType.RepliedPositive, StopReason.RepliedPositive],
  [EventType.RepliedNegative, StopReason.RepliedNegative],
  [EventType.Bounced, StopReason.Bounced],
  [EventType.Unsubscribed, StopReason.Unsubscribed],
])

const byDayThenId = (left: CampaignEvent, right: CampaignEvent): number =>
  left.eventDay - right.eventDay || left.eventId.localeCompare(right.eventId)

function violationReason(isIneligible: boolean, sentAfterStop: boolean): string | null {
  if (isIneligible) return 'Sent to an ineligible contact'
  return sentAfterStop ? 'Sent after a stop trigger' : null
}

function resolveState(flags: { isSuppressed: boolean; isStopped: boolean; isHeld: boolean }): ContactState {
  if (flags.isSuppressed) return ContactState.Suppressed
  if (flags.isStopped) return ContactState.Stopped
  return flags.isHeld ? ContactState.Held : ContactState.Active
}

function buildContactSequence(
  contactKey: string,
  opportunities: Opportunity[],
  events: CampaignEvent[],
): ContactSequence {
  const sorted = [...events].sort(byDayThenId)
  const isIneligible = mostRestrictive(opportunities.map((entry) => entry.eligibility.status)) === EligibilityStatus.Ineligible
  const isUnverified = opportunities.some((entry) => entry.eligibility.status === EligibilityStatus.NeedsVerification)

  const stopIndex = sorted.findIndex((event) => STOP_REASON_BY_EVENT.has(event.eventType))
  const firstStop = stopIndex === -1 ? null : (sorted[stopIndex] as CampaignEvent)
  const unsubscribe = sorted.find((event) => event.eventType === EventType.Unsubscribed) ?? null
  const reasonEvent = unsubscribe ?? firstStop

  const violations: SequenceViolation[] = []
  const sentEventByStep = new Map<number, string>()
  sorted.forEach((event, index) => {
    if (event.eventType !== EventType.Sent) return
    if (!sentEventByStep.has(event.step)) sentEventByStep.set(event.step, event.eventId)
    const sentAfterStop = stopIndex !== -1 && index > stopIndex
    const reason = violationReason(isIneligible, sentAfterStop)
    if (reason) violations.push({ eventId: event.eventId, step: event.step, day: event.eventDay, reason })
  })
  const violationEventIds = new Set(violations.map((violation) => violation.eventId))

  const cancelFromDay = isIneligible ? 0 : (firstStop?.eventDay ?? Infinity)
  const steps = FOLLOW_UP_SCHEDULE.map(({ step, day }) => {
    const sentEventId = sentEventByStep.get(step) ?? null
    const unsentStatus = day >= cancelFromDay ? StepStatus.Cancelled : StepStatus.Pending
    const status = sentEventId ? StepStatus.Sent : unsentStatus
    return { step, scheduledDay: day, status, sentEventId, violation: sentEventId ? violationEventIds.has(sentEventId) : false }
  })

  const hasSent = sentEventByStep.size > 0
  const state = resolveState({ isSuppressed: isIneligible || unsubscribe !== null, isStopped: firstStop !== null, isHeld: isUnverified && !hasSent })

  return {
    contactKey,
    postingIds: opportunities.flatMap((entry) => entry.sourcePostingIds).sort(),
    variants: [...new Set(sorted.filter((event) => event.eventType === EventType.Sent).map((event) => event.variant))].sort(),
    state,
    stopReason: isIneligible ? StopReason.IneligibleRole : ((reasonEvent && STOP_REASON_BY_EVENT.get(reasonEvent.eventType)) ?? null),
    stopDay: isIneligible ? null : (reasonEvent?.eventDay ?? null),
    addressInvalid: sorted.some((event) => event.eventType === EventType.Bounced),
    steps,
    violations,
    meetingsBooked: sorted.filter((event) => event.eventType === EventType.MeetingBooked).length,
    clientsWon: sorted.filter((event) => event.eventType === EventType.ClientWon).length,
  }
}

export function buildSequenceReport(events: CampaignEvent[], opportunities: Opportunity[]): SequenceReport {
  const { contactKeyByPosting } = indexPostings(opportunities)
  const opportunitiesByContact = new Map<string, Opportunity[]>()
  for (const opportunity of opportunities) {
    const contactKey = contactKeyByPosting.get(opportunity.id) as string
    opportunitiesByContact.set(contactKey, [...(opportunitiesByContact.get(contactKey) ?? []), opportunity])
  }
  const eventsByContact = new Map<string, CampaignEvent[]>()
  for (const event of events) {
    const contactKey = contactKeyByPosting.get(event.postingId)
    if (contactKey) eventsByContact.set(contactKey, [...(eventsByContact.get(contactKey) ?? []), event])
  }

  const contacts = [...opportunitiesByContact.entries()]
    .map(([contactKey, contactOpportunities]) =>
      buildContactSequence(contactKey, contactOpportunities, eventsByContact.get(contactKey) ?? []),
    )
    .sort((left, right) => (left.postingIds[0] as string).localeCompare(right.postingIds[0] as string))

  const suppressionList = contacts.flatMap((contact): SuppressionEntry[] =>
    contact.stopReason
      ? [
          {
            contactKey: contact.contactKey,
            postingIds: contact.postingIds,
            reason: contact.stopReason,
            day: contact.stopDay,
            scope:
              contact.stopReason === StopReason.Unsubscribed
                ? SuppressionScope.PermanentAllVariants
                : SuppressionScope.AllPostingsAtDomain,
          },
        ]
      : [],
  )

  return {
    asOfDay: events.reduce((latest, event) => Math.max(latest, event.eventDay), 0),
    schedule: FOLLOW_UP_SCHEDULE,
    contacts,
    suppressionList,
  }
}
