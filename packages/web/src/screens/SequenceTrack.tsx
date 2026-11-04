import { ContactState, StepStatus, StopReason, type ContactSequence, type SequenceReport } from '@hireintercept/core/sequences'
import { roundedShare } from '@hireintercept/core/math'
import { Tone } from '../components/Badge'
import { Text, TextTone, TextVariant } from '../components/Text'
import { PostingLinks } from './PostingLinks'
import './SequenceTrack.css'

export const STOP_REASON_LABEL: Record<StopReason, string> = {
  [StopReason.RepliedPositive]: 'Positive reply',
  [StopReason.RepliedNegative]: 'Negative reply',
  [StopReason.Bounced]: 'Bounce (address invalid)',
  [StopReason.Unsubscribed]: 'Unsubscribed (permanent)',
  [StopReason.IneligibleRole]: 'Ineligible role',
}

const STOP_FLAG_LABEL: Record<StopReason, string> = {
  [StopReason.RepliedPositive]: 'Replied',
  [StopReason.RepliedNegative]: 'Declined',
  [StopReason.Bounced]: 'Bounced',
  [StopReason.Unsubscribed]: 'Unsubscribed',
  [StopReason.IneligibleRole]: 'Ineligible',
}

export const STATE_TONE: Record<ContactState, Tone> = {
  [ContactState.Active]: Tone.Good,
  [ContactState.Stopped]: Tone.Warn,
  [ContactState.Suppressed]: Tone.Bad,
  [ContactState.Held]: Tone.Info,
}

const STATE_LABEL: Record<ContactState, string> = {
  [ContactState.Active]: 'Active',
  [ContactState.Stopped]: 'Stopped',
  [ContactState.Suppressed]: 'Suppressed',
  [ContactState.Held]: 'Held',
}

type Schedule = SequenceReport['schedule']

export interface TrackRowData {
  contact: ContactSequence
  caption?: string
}

const positionOf = (day: number, lastDay: number) => (lastDay === 0 ? 0 : Math.min(roundedShare(day, lastDay, 100), 100))

function describeTrack(contact: ContactSequence, schedule: Schedule): string {
  const steps = schedule.map((entry, position) => `step ${entry.step} day ${entry.day} ${contact.steps[position]?.status ?? 'unknown'}`)
  const stop = contact.stopReason ? `; stopped: ${STOP_REASON_LABEL[contact.stopReason]}` : ''
  return `${steps.join(', ')}${stop}`
}

function progressPosition(contact: ContactSequence, schedule: Schedule, lastDay: number, stopPosition: number | null): number {
  if (stopPosition !== null) return stopPosition
  const lastSent = schedule.reduce((latest, entry, position) => (contact.steps[position]?.status === StepStatus.Sent ? entry.day : latest), 0)
  return positionOf(lastSent, lastDay)
}

export function SequenceLegend() {
  return (
    <div className="seq-legend">
      <strong className="seq-legend__title">Timeline</strong>
      <span><i className="seq-marker seq-marker--legend" data-status={StepStatus.Sent} />Sent</span>
      <span><i className="seq-marker seq-marker--legend" data-status={StepStatus.Pending} />Scheduled</span>
      <span><i className="seq-marker seq-marker--legend" data-status={StepStatus.Cancelled} />Cancelled</span>
      <span><i className="seq-legend__stop" />Stopped</span>
      <span><i className="seq-legend__stop" data-tone="bad" />Suppressed</span>
      <span><i className="seq-marker seq-marker--legend" data-status={StepStatus.Sent} data-violation="true" />Rule violation</span>
    </div>
  )
}

function TrackHeader({ schedule, lastDay }: { schedule: Schedule; lastDay: number }) {
  return (
    <div className="seq-row seq-row--header" aria-hidden="true">
      <span>Contact</span>
      <span className="seq-track seq-track--axis">
        {schedule.map((entry) => (
          <span key={entry.step} className="seq-tick" style={{ left: `${positionOf(entry.day, lastDay)}%` }}>
            <b>Day {entry.day}</b>
            <small>Step {entry.step}</small>
          </span>
        ))}
      </span>
      <span>Outcome</span>
    </div>
  )
}

function TrackRow({ contact, caption, schedule, lastDay }: TrackRowData & { schedule: Schedule; lastDay: number }) {
  const stopPosition = contact.stopReason ? positionOf(contact.stopDay ?? 0, lastDay) : null
  const progress = progressPosition(contact, schedule, lastDay, stopPosition)
  const wins = [contact.meetingsBooked > 0 ? 'Meeting booked' : '', contact.clientsWon > 0 ? 'Client won' : ''].filter(Boolean)
  const hasViolation = contact.steps.some((step) => step.violation)
  const violationReasons = [...new Set(contact.violations.map((violation) => violation.reason))].join(' · ')
  const flagTone = contact.state === ContactState.Suppressed ? 'bad' : 'warn'
  return (
    <div className="seq-item">
      {caption && <Text variant={TextVariant.Small} tone={TextTone.Soft}>{caption}</Text>}
      <div className="seq-row">
        <div className="seq-contact">
          <Text strong>{contact.contactKey}</Text>
          <Text variant={TextVariant.Small} tone={TextTone.Muted}><PostingLinks postingIds={contact.postingIds} /></Text>
        </div>
        <div className="seq-track" role="img" aria-label={describeTrack(contact, schedule)}>
          {schedule.map((entry) => <span key={entry.step} className="seq-gridline" style={{ left: `${positionOf(entry.day, lastDay)}%` }} />)}
          <span className="seq-line" />
          <span className="seq-line seq-line--done" style={{ width: `${progress}%` }} />
          {schedule.map((entry, position) => {
            const step = contact.steps[position]
            if (!step) return null
            return (
              <span
                key={entry.step}
                className="seq-marker"
                data-status={step.status}
                data-violation={step.violation}
                style={{ left: `${positionOf(entry.day, lastDay)}%` }}
                title={`Step ${entry.step} · day ${entry.day}: ${step.status}${step.violation ? ' (violation)' : ''}`}
              />
            )
          })}
          {stopPosition !== null && contact.stopReason && (
            <span className="seq-flag" data-tone={flagTone} data-edge={stopPosition < 10} style={{ left: `${stopPosition}%` }}>
              {STOP_FLAG_LABEL[contact.stopReason]}
            </span>
          )}
        </div>
        <div className="seq-outcome" data-state={contact.state}>
          <span className="seq-rail" aria-hidden="true" />
          <div className="seq-outcome__text">
            <span className="seq-reason">{contact.stopReason ? STOP_REASON_LABEL[contact.stopReason] : 'Still running'}</span>
            <span className="seq-sub">{STATE_LABEL[contact.state]}{contact.stopDay === null || !contact.stopReason ? '' : ` · day ${contact.stopDay}`}</span>
            {wins.length > 0 && <span className="seq-extra">{wins.join(' · ')}</span>}
            {hasViolation && <span className="seq-extra seq-extra--bad">{violationReasons}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SequenceTrack({ rows, schedule }: { rows: TrackRowData[]; schedule: Schedule }) {
  const lastDay = schedule.at(-1)?.day ?? 0
  return (
    <div className="seq">
      <SequenceLegend />
      <TrackHeader schedule={schedule} lastDay={lastDay} />
      {rows.length === 0 && <Text tone={TextTone.Muted}>No contacts in this state.</Text>}
      {rows.map((row) => <TrackRow key={row.contact.contactKey} {...row} schedule={schedule} lastDay={lastDay} />)}
    </div>
  )
}
