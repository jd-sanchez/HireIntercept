import { ContactState, StepStatus, StopReason, type ContactSequence, type SequenceReport } from '@hireintercept/core/sequences'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { Badge, Tone } from '../components/Badge'
import { Card, Section } from '../components/Card'
import { DataTable, type Column } from '../components/DataTable'
import { Gap, Stack } from '../components/Layout'
import { Text, TextTone, TextVariant } from '../components/Text'

const FEATURED_EXAMPLES = [
  { postingId: 'JOB-001', label: 'JOB-001: positive reply on day 1 cancels steps 2–4' },
  { postingId: 'JOB-002', label: 'JOB-002 → JOB-029: negative reply stops the whole domain, including the never-contacted duplicate' },
  { postingId: 'JOB-004', label: 'JOB-004 → JOB-030: unsubscribe is permanent suppression for the domain' },
  { postingId: 'JOB-008', label: 'JOB-008: bounce stops the contact, address invalid' },
  { postingId: 'JOB-018', label: 'JOB-018: active, steps 1–2 sent, steps 3–4 pending' },
  { postingId: 'JOB-009', label: 'JOB-009: ineligible contact, suppressed; the recorded step-2 send is a violation' },
]

const STEP_TONE: Record<StepStatus, Tone> = {
  [StepStatus.Sent]: Tone.Good,
  [StepStatus.Pending]: Tone.Info,
  [StepStatus.Cancelled]: Tone.Neutral,
}

const STATE_TONE: Record<ContactState, Tone> = {
  [ContactState.Active]: Tone.Good,
  [ContactState.Stopped]: Tone.Warn,
  [ContactState.Suppressed]: Tone.Bad,
  [ContactState.Held]: Tone.Info,
}

const STOP_REASON_LABEL: Record<StopReason, string> = {
  [StopReason.RepliedPositive]: 'Positive reply',
  [StopReason.RepliedNegative]: 'Negative reply',
  [StopReason.Bounced]: 'Bounce (address invalid)',
  [StopReason.Unsubscribed]: 'Unsubscribed (permanent)',
  [StopReason.IneligibleRole]: 'Ineligible role',
}

type SuppressionEntry = SequenceReport['suppressionList'][number]

const SUPPRESSION_COLUMNS: Column<SuppressionEntry>[] = [
  { id: 'contact', header: 'Contact', render: (entry) => entry.contactKey },
  { id: 'postings', header: 'Postings', render: (entry) => entry.postingIds.join(', ') },
  { id: 'reason', header: 'Reason', render: (entry) => STOP_REASON_LABEL[entry.reason] },
  { id: 'day', header: 'Day', render: (entry) => entry.day ?? 'from the start' },
  { id: 'scope', header: 'Scope', render: (entry) => entry.scope.replaceAll('_', ' ') },
]

function timelineColumns(schedule: SequenceReport['schedule']): Column<ContactSequence>[] {
  return [
    {
      id: 'contact',
      header: 'Contact (domain)',
      width: '24%',
      render: (contact) => (
        <Stack gap={Gap.Tight}>
          <Text strong>{contact.contactKey}</Text>
          <Text variant={TextVariant.Small} tone={TextTone.Muted}>{contact.postingIds.join(', ')}</Text>
        </Stack>
      ),
    },
    { id: 'state', header: 'State', width: '10%', render: (contact) => <Badge tone={STATE_TONE[contact.state]}>{contact.state}</Badge> },
    ...schedule.map((entry, position) => ({
      id: `step-${entry.step}`,
      header: `Step ${entry.step} · day ${entry.day}`,
      width: '11%',
      render: (contact: ContactSequence) => {
        const step = contact.steps[position]
        if (!step) return null
        return (
          <Stack gap={Gap.Tight}>
            <Badge tone={STEP_TONE[step.status]}>{step.status}</Badge>
            {step.violation && <Badge tone={Tone.Bad}>violation</Badge>}
          </Stack>
        )
      },
    })),
    {
      id: 'stop',
      header: 'Stop reason',
      render: (contact) => (
        <Stack gap={Gap.Tight}>
          <Text variant={TextVariant.Small}>
            {contact.stopReason ? `${STOP_REASON_LABEL[contact.stopReason]}${contact.stopDay === null ? '' : ` · day ${contact.stopDay}`}` : '—'}
          </Text>
          {contact.meetingsBooked > 0 && <Badge tone={Tone.Good}>meeting booked</Badge>}
          {contact.clientsWon > 0 && <Badge tone={Tone.Good}>client won</Badge>}
        </Stack>
      ),
    },
  ]
}

function TimelineTable({ contacts, schedule }: { contacts: ContactSequence[]; schedule: SequenceReport['schedule'] }) {
  return <DataTable columns={timelineColumns(schedule)} rows={contacts} getRowKey={(contact) => contact.contactKey} minWidth="46rem" />
}

function SequencesBody({ report }: { report: SequenceReport }) {
  return (
    <Stack gap={Gap.Loose}>
      <Card>
        <Stack gap={Gap.Tight}>
          <Text variant={TextVariant.Heading}>As of day {report.asOfDay} (latest event)</Text>
          <Text tone={TextTone.Soft}>
            Proposed schedule: {report.schedule.map((entry) => `step ${entry.step} on day ${entry.day}`).join(', ')}. A reply, bounce or
            unsubscribe stops every not-yet-sent step for the whole domain.
          </Text>
        </Stack>
      </Card>

      <Section title="Required examples">
        <Stack gap={Gap.Loose}>
          {FEATURED_EXAMPLES.map((example) => {
            const contact = report.contacts.find((entry) => entry.postingIds.includes(example.postingId))
            return (
              <Stack key={example.postingId} gap={Gap.Tight}>
                <Text strong>{example.label}</Text>
                {contact && <TimelineTable contacts={[contact]} schedule={report.schedule} />}
              </Stack>
            )
          })}
        </Stack>
      </Section>

      <Section title="All contacts"><TimelineTable contacts={report.contacts} schedule={report.schedule} /></Section>

      <Section title="Suppression list">
        <DataTable columns={SUPPRESSION_COLUMNS} rows={report.suppressionList} getRowKey={(entry) => entry.contactKey} emptyMessage="No suppressed contacts." />
      </Section>
    </Stack>
  )
}

export function SequencesScreen() {
  const state = useApi<SequenceReport>('/api/sequences')
  return (
    <Stack gap={Gap.Loose}>
      <Stack gap={Gap.Tight}>
        <Text as="h1" variant={TextVariant.Title}>Sequences</Text>
        <Text tone={TextTone.Soft}>Every contact's outreach timeline and why it stopped.</Text>
      </Stack>
      <ApiBoundary state={state}>{(report) => <SequencesBody report={report} />}</ApiBoundary>
    </Stack>
  )
}
