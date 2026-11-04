import { useState } from 'react'
import { ContactState, StepStatus, StopReason, type SequenceReport } from '@hireintercept/core/sequences'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { roundedShare } from '@hireintercept/core/math'
import { Tone } from '../components/Badge'
import { Callout } from '../components/Callout'
import { Section } from '../components/Card'
import { BreakdownBars, type BreakdownRow } from '../components/BreakdownBars'
import { OutcomeBars, OutcomeTone, type OutcomeRow } from '../components/OutcomeBars'
import { SegmentedControl } from '../components/Button'
import { ClearFilters } from '../components/ClearFilters'
import { SearchInput } from '../components/Field'
import { Cluster, Gap, Spread, Stack } from '../components/Layout'
import { Stat } from '../components/Stat'
import { Text, TextTone, TextVariant } from '../components/Text'
import { DataContext } from './DataContext'
import { SuppressionList } from './SuppressionList'
import './SequencesScreen.css'
import { SequenceTrack, STOP_REASON_LABEL, type TrackRowData } from './SequenceTrack'

const FEATURED_EXAMPLES = [
  { postingId: 'JOB-001', label: 'JOB-001: positive reply on day 1 cancels steps 2–4' },
  { postingId: 'JOB-002', label: 'JOB-002 → JOB-029: negative reply stops the whole domain, including the never-contacted duplicate' },
  { postingId: 'JOB-004', label: 'JOB-004 → JOB-030: unsubscribe is permanent suppression for the domain' },
  { postingId: 'JOB-008', label: 'JOB-008: bounce stops the contact; the message was undeliverable' },
  { postingId: 'JOB-018', label: 'JOB-018: active, steps 1–2 sent, steps 3–4 pending' },
  { postingId: 'JOB-009', label: 'JOB-009: ineligible contact, suppressed; both recorded sends (steps 1 and 2) are violations' },
]

const STATE_TONE: Record<ContactState, Tone> = {
  [ContactState.Active]: Tone.Good,
  [ContactState.Stopped]: Tone.Warn,
  [ContactState.Suppressed]: Tone.Bad,
  [ContactState.Held]: Tone.Info,
}

const share = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

const STATE_LABEL: Record<ContactState, string> = {
  [ContactState.Active]: 'Active',
  [ContactState.Stopped]: 'Stopped',
  [ContactState.Suppressed]: 'Suppressed',
  [ContactState.Held]: 'Held',
}

const STOP_REASON_NOTE: Record<StopReason, string> = {
  [StopReason.RepliedPositive]: 'They answered, so follow-ups stop',
  [StopReason.RepliedNegative]: 'Not interested: the whole domain stops',
  [StopReason.Bounced]: 'Could not be delivered, nothing more is sent',
  [StopReason.Unsubscribed]: 'Permanent suppression for the domain',
  [StopReason.IneligibleRole]: 'Job cannot be filled overseas, so never contacted',
}

enum TimelineView {
  Examples = 'examples',
  AllContacts = 'all-contacts',
}

const TIMELINE_VIEW_OPTIONS = [
  { value: TimelineView.Examples, label: 'Required examples' },
  { value: TimelineView.AllContacts, label: 'All contacts' },
]

const ALL_STATES = 'all'
type StateFilter = ContactState | typeof ALL_STATES

function SequencesBody({ report }: { report: SequenceReport }) {
  const [stateFilter, setStateFilter] = useState<StateFilter>(ALL_STATES)
  const [search, setSearch] = useState('')
  const [timelineView, setTimelineView] = useState(TimelineView.Examples)
  const countsByState = report.contacts.reduce<Record<ContactState, number>>(
    (counts, contact) => ({ ...counts, [contact.state]: counts[contact.state] + 1 }),
    { [ContactState.Active]: 0, [ContactState.Stopped]: 0, [ContactState.Suppressed]: 0, [ContactState.Held]: 0 },
  )
  const exampleRows = FEATURED_EXAMPLES.reduce<TrackRowData[]>((rows, example) => {
    const contact = report.contacts.find((entry) => entry.postingIds.includes(example.postingId))
    return contact ? [...rows, { contact, caption: example.label }] : rows
  }, [])
  const stepRows: OutcomeRow[] = report.schedule.map((entry, position) => {
    const countStatus = (status: StepStatus) => report.contacts.filter((contact) => contact.steps[position]?.status === status).length
    return {
      label: `Step ${entry.step} · day ${entry.day}`,
      caption: entry.day > report.asOfDay ? `not due yet` : undefined,
      segments: [
        { label: 'Sent', count: countStatus(StepStatus.Sent), tone: OutcomeTone.Primary },
        { label: 'Scheduled', count: countStatus(StepStatus.Pending), tone: OutcomeTone.Soft },
        { label: 'Cancelled', count: countStatus(StepStatus.Cancelled), tone: OutcomeTone.Muted },
      ],
    }
  })
  const firstFollowUp = report.schedule.findIndex((entry) => entry.step > 1)
  const cancelledFollowUps = report.contacts.reduce(
    (total, contact) => total + contact.steps.filter((step, position) => position >= firstFollowUp && step.status === StepStatus.Cancelled).length,
    0,
  )
  const stopCounts = report.contacts.reduce((counts, contact) => (contact.stopReason ? counts.set(contact.stopReason, (counts.get(contact.stopReason) ?? 0) + 1) : counts), new Map<StopReason, number>())
  const reasonRows: BreakdownRow[] = [...stopCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => ({
      label: STOP_REASON_LABEL[reason],
      count,
      note: STOP_REASON_NOTE[reason],
    }))
  const stoppedTotal = reasonRows.reduce((running, row) => running + row.count, 0)
  const searchTerm = search.trim().toLowerCase()
  const visibleContacts = report.contacts.filter(
    (contact) =>
      (stateFilter === ALL_STATES || contact.state === stateFilter) &&
      (searchTerm === '' || contact.contactKey.toLowerCase().includes(searchTerm) || contact.postingIds.some((postingId) => postingId.toLowerCase().includes(searchTerm))),
  )
  const activeContactFilterCount = (stateFilter !== ALL_STATES ? 1 : 0) + (searchTerm !== '' ? 1 : 0)
  const stateOptions: { value: StateFilter; label: string }[] = [
    { value: ALL_STATES, label: `All · ${report.contacts.length}` },
    ...Object.values(ContactState).map((state) => ({ value: state, label: `${STATE_LABEL[state]} · ${countsByState[state]}` })),
  ]
  return (
    <Stack gap={Gap.Loose}>
      <Callout tone={Tone.Info}>
        <Text variant={TextVariant.Heading}>Proposed schedule: {report.schedule.map((entry) => `step ${entry.step} on day ${entry.day}`).join(', ')}</Text>
        <Text variant={TextVariant.Small}>A reply, bounce or unsubscribe stops every not-yet-sent step for the whole domain.</Text>
      </Callout>

      <div className="seq-stats">
        {Object.values(ContactState).map((state) => (
          <Stat key={state} label={STATE_LABEL[state]} value={countsByState[state]} hint={`${share(countsByState[state], report.contacts.length)}% of contacts`}
            sharePercent={share(countsByState[state], report.contacts.length)}
            tone={STATE_TONE[state]}
          />
        ))}
      </div>

      <div className="seq-pair">
        <Section
          title="Step outcomes"
          description="Each contact at each scheduled step."
          aside={`${cancelledFollowUps} follow-ups cancelled`}
        >
          <OutcomeBars
            rows={stepRows}
            legend={[
              { label: 'Sent', tone: OutcomeTone.Primary },
              { label: 'Scheduled', tone: OutcomeTone.Soft },
              { label: 'Cancelled', tone: OutcomeTone.Muted },
            ]}
          />
        </Section>

        <Section
          title="Why follow-ups stopped"
          description="The rule that ended each stopped contact's follow-ups."
          aside={`${stoppedTotal} of ${report.contacts.length} contacts`}
        >
          <BreakdownBars rows={reasonRows} />
        </Section>
      </div>

      <Section
        title="Contact timelines"
        description="Outreach from first send to day 15, and where each contact's follow-ups stopped."
        aside={timelineView === TimelineView.Examples ? `${exampleRows.length} examples` : `${visibleContacts.length} of ${report.contacts.length} contacts`}
      >
        <Stack>
          <SegmentedControl label="Timeline view" value={timelineView} options={TIMELINE_VIEW_OPTIONS} onChange={setTimelineView} />
          {timelineView === TimelineView.Examples ? (
            <SequenceTrack rows={exampleRows} schedule={report.schedule} />
          ) : (
            <>
              <Cluster gap={Gap.Normal}>
                <SegmentedControl label="Filter contacts by state" value={stateFilter} options={stateOptions} onChange={setStateFilter} />
                <SearchInput value={search} placeholder="Search by contact or posting ID" onChange={setSearch} />
                <ClearFilters activeCount={activeContactFilterCount} onClear={() => { setStateFilter(ALL_STATES); setSearch('') }} />
              </Cluster>
              <span role="status" className="visually-hidden">{visibleContacts.length} of {report.contacts.length} contacts shown</span>
              <SequenceTrack rows={visibleContacts.map((contact) => ({ contact }))} schedule={report.schedule} />
            </>
          )}
        </Stack>
      </Section>
    </Stack>
  )
}

function headlineFor(report: SequenceReport): string {
  const halted = report.contacts.filter((contact) => contact.state === ContactState.Stopped || contact.state === ContactState.Suppressed).length
  const running = report.contacts.filter((contact) => contact.state === ContactState.Active).length
  return `${halted} of ${report.contacts.length} contacts have stopped or are suppressed, and ${running} are still running.`
}

export function SequencesScreen() {
  const state = useApi<SequenceReport>('/api/sequences')
  return (
    <Stack gap={Gap.Loose}>
      <Spread>
        <Stack gap={Gap.Tight}>
          <Text as="h1" variant={TextVariant.Title}>Follow-ups</Text>
          <Text tone={TextTone.Soft}>{state.data ? headlineFor(state.data) : "Every contact's outreach timeline and why it stopped."}</Text>
          <DataContext />
        </Stack>
        <ApiBoundary state={state}>{(report) => <SuppressionList entries={report.suppressionList} />}</ApiBoundary>
      </Spread>
      <ApiBoundary state={state}>{(report) => <SequencesBody report={report} />}</ApiBoundary>
    </Stack>
  )
}
