import { describe, expect, it } from 'vitest'
import { buildSequenceReport, ContactState, StepStatus, StopReason, SuppressionScope } from '../src'
import { eventsImport, opportunities } from './dataset'

const report = buildSequenceReport(eventsImport.records, opportunities)
const contactFor = (postingId: string) => {
  const contact = report.contacts.find((entry) => entry.postingIds.includes(postingId))
  if (!contact) throw new Error(`No contact for ${postingId}`)
  return contact
}
const statuses = (postingId: string) => contactFor(postingId).steps.map((step) => step.status)

describe('sequence engine', () => {
  it('uses the proposed schedule and the latest event day as "as of"', () => {
    expect(report.schedule.map((entry) => entry.day)).toEqual([1, 4, 8, 15])
    expect(report.asOfDay).toBe(4)
  })

  it('JOB-001: positive reply on day 1 cancels steps 2-4; meeting and win recorded', () => {
    const contact = contactFor('JOB-001')
    expect(statuses('JOB-001')).toEqual([StepStatus.Sent, StepStatus.Cancelled, StepStatus.Cancelled, StepStatus.Cancelled])
    expect(contact.state).toBe(ContactState.Stopped)
    expect(contact.stopReason).toBe(StopReason.RepliedPositive)
    expect([contact.meetingsBooked, contact.clientsWon]).toEqual([1, 1])
  })

  it('JOB-002: negative reply stops the contact and JOB-029 (same domain) shares the suppression', () => {
    expect(contactFor('JOB-002').state).toBe(ContactState.Stopped)
    expect(contactFor('JOB-002').stopReason).toBe(StopReason.RepliedNegative)
    expect(contactFor('JOB-029')).toBe(contactFor('JOB-002'))
    const entry = report.suppressionList.find((item) => item.postingIds.includes('JOB-029'))
    expect(entry?.postingIds).toEqual(['JOB-002', 'JOB-029'])
    expect(entry?.reason).toBe(StopReason.RepliedNegative)
  })

  it('JOB-004: unsubscribe is permanent suppression that also covers JOB-030', () => {
    expect(contactFor('JOB-004').state).toBe(ContactState.Suppressed)
    expect(contactFor('JOB-030')).toBe(contactFor('JOB-004'))
    const entry = report.suppressionList.find((item) => item.postingIds.includes('JOB-030'))
    expect(entry?.reason).toBe(StopReason.Unsubscribed)
    expect(entry?.scope).toBe(SuppressionScope.PermanentAllVariants)
  })

  it('JOB-008: bounce stops the contact and marks the address invalid', () => {
    const contact = contactFor('JOB-008')
    expect(contact.state).toBe(ContactState.Stopped)
    expect(contact.stopReason).toBe(StopReason.Bounced)
    expect(contact.addressInvalid).toBe(true)
  })

  it('JOB-018: active with steps 1-2 sent and steps 3-4 pending', () => {
    expect(contactFor('JOB-018').state).toBe(ContactState.Active)
    expect(statuses('JOB-018')).toEqual([StepStatus.Sent, StepStatus.Sent, StepStatus.Pending, StepStatus.Pending])
  })

  it('JOB-009: suppressed as ineligible, and the recorded step-2 send is a violation', () => {
    const contact = contactFor('JOB-009')
    expect(contact.state).toBe(ContactState.Suppressed)
    expect(contact.stopReason).toBe(StopReason.IneligibleRole)
    expect(contact.violations.map((violation) => violation.step)).toContain(2)
    expect(contact.steps[1]?.violation).toBe(true)
    expect(contact.steps.slice(2).map((step) => step.status)).toEqual([StepStatus.Cancelled, StepStatus.Cancelled])
  })

  it('holds needs_verification contacts that have not been contacted', () => {
    const held = report.contacts.filter((contact) => contact.state === ContactState.Held)
    expect(held.map((contact) => contact.postingIds[0])).toEqual(['JOB-025'])
  })

  it('suppresses never-contacted ineligible contacts from the start', () => {
    expect(report.contacts.filter((contact) => contact.state === ContactState.Suppressed).length).toBeGreaterThanOrEqual(10)
    expect(contactFor('JOB-027').state).toBe(ContactState.Suppressed)
  })
})
