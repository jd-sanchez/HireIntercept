import { ContactState, StepStatus, StopReason, type ContactSequence, type SequenceReport } from '@hireintercept/core/sequences'
import { useApi } from '../api'
import { ApiBoundary, Badge, Section, Tone, tableCellClass, tableHeadClass } from '../components/ui'

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

function TimelineRow({ contact }: { contact: ContactSequence }) {
  return (
    <tr>
      <td className={tableCellClass}>
        <div className="font-medium">{contact.contactKey}</div>
        <div className="text-xs text-ink-muted">{contact.postingIds.join(', ')}</div>
      </td>
      <td className={tableCellClass}><Badge tone={STATE_TONE[contact.state]}>{contact.state}</Badge></td>
      {contact.steps.map((step) => (
        <td key={step.step} className={tableCellClass}>
          <Badge tone={STEP_TONE[step.status]}>{step.status}</Badge>
          {step.violation && <div className="mt-1"><Badge tone={Tone.Bad}>violation</Badge></div>}
        </td>
      ))}
      <td className={tableCellClass}>
        {contact.stopReason ? `${STOP_REASON_LABEL[contact.stopReason]}${contact.stopDay === null ? '' : ` · day ${contact.stopDay}`}` : '—'}
        {contact.meetingsBooked > 0 && <div><Badge tone={Tone.Good}>meeting booked</Badge></div>}
        {contact.clientsWon > 0 && <div><Badge tone={Tone.Good}>client won</Badge></div>}
      </td>
    </tr>
  )
}

function TimelineTable({ contacts, schedule }: { contacts: ContactSequence[]; schedule: SequenceReport['schedule'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className={tableHeadClass}>Contact (domain)</th>
            <th className={tableHeadClass}>State</th>
            {schedule.map((entry) => <th key={entry.step} className={tableHeadClass}>Step {entry.step} · day {entry.day}</th>)}
            <th className={tableHeadClass}>Stop reason</th>
          </tr>
        </thead>
        <tbody>{contacts.map((contact) => <TimelineRow key={contact.contactKey} contact={contact} />)}</tbody>
      </table>
    </div>
  )
}

function SequencesBody({ report }: { report: SequenceReport }) {
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold">As of day {report.asOfDay} (latest event)</p>
      <p className="text-sm text-ink-soft">
        Proposed schedule: {report.schedule.map((entry) => `step ${entry.step} on day ${entry.day}`).join(', ')}. A reply, bounce or
        unsubscribe stops every not-yet-sent step for the whole domain.
      </p>

      <Section title="Required examples">
        <div className="space-y-4">
          {FEATURED_EXAMPLES.map((example) => {
            const contact = report.contacts.find((entry) => entry.postingIds.includes(example.postingId))
            return (
              <div key={example.postingId}>
                <p className="mb-1 text-sm font-medium">{example.label}</p>
                {contact && <TimelineTable contacts={[contact]} schedule={report.schedule} />}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="All contacts"><TimelineTable contacts={report.contacts} schedule={report.schedule} /></Section>

      <Section title="Suppression list">
        <table className="w-full">
          <thead>
            <tr>
              <th className={tableHeadClass}>Contact</th>
              <th className={tableHeadClass}>Postings</th>
              <th className={tableHeadClass}>Reason</th>
              <th className={tableHeadClass}>Day</th>
              <th className={tableHeadClass}>Scope</th>
            </tr>
          </thead>
          <tbody>
            {report.suppressionList.map((entry) => (
              <tr key={entry.contactKey}>
                <td className={tableCellClass}>{entry.contactKey}</td>
                <td className={tableCellClass}>{entry.postingIds.join(', ')}</td>
                <td className={tableCellClass}>{STOP_REASON_LABEL[entry.reason]}</td>
                <td className={tableCellClass}>{entry.day ?? 'from the start'}</td>
                <td className={tableCellClass}>{entry.scope.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

export function SequencesScreen() {
  const state = useApi<SequenceReport>('/api/sequences')
  return <ApiBoundary state={state}>{(report) => <SequencesBody report={report} />}</ApiBoundary>
}
