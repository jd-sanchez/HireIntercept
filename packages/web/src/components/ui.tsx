import type { ReactNode } from 'react'
import { DraftStatus, EligibilityStatus } from '@hireintercept/core/types'
import type { ApiState } from '../api'

export enum Tone {
  Neutral = 'neutral',
  Good = 'good',
  Warn = 'warn',
  Bad = 'bad',
  Info = 'info',
}

const TONE_CLASSES: Record<Tone, string> = {
  [Tone.Neutral]: 'bg-sunken text-ink-soft',
  [Tone.Good]: 'bg-good-soft text-good-ink',
  [Tone.Warn]: 'bg-warn-soft text-warn-ink',
  [Tone.Bad]: 'bg-bad-soft text-bad-ink',
  [Tone.Info]: 'bg-info-soft text-info-ink',
}

export function Badge({ tone = Tone.Neutral, children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>{children}</span>
}

const STATUS_PRESENTATION: Record<EligibilityStatus, { label: string; tone: Tone }> = {
  [EligibilityStatus.Eligible]: { label: 'Eligible', tone: Tone.Good },
  [EligibilityStatus.NeedsVerification]: { label: 'Needs verification', tone: Tone.Warn },
  [EligibilityStatus.Ineligible]: { label: 'Ineligible', tone: Tone.Bad },
}

export function StatusBadge({ status }: { status: EligibilityStatus }) {
  const { label, tone } = STATUS_PRESENTATION[status]
  return <Badge tone={tone}>{label}</Badge>
}

export const SyntheticBadge = () => <Badge tone={Tone.Info}>Synthetic data</Badge>

export const DRAFT_STATUS_LABEL: Record<DraftStatus, string> = {
  [DraftStatus.Ready]: 'Draft (never sent)',
  [DraftStatus.HeldPendingVerification]: 'Held pending verification',
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface shadow-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
      {children}
    </section>
  )
}

export function ApiBoundary<Data>({ state, children }: { state: ApiState<Data>; children: (data: Data) => ReactNode }) {
  if (state.error) return <p className="rounded bg-bad-soft p-3 text-sm text-bad-ink">Could not load data: {state.error}</p>
  if (!state.data) return <p className="p-3 text-sm text-ink-muted">Loading…</p>
  return <>{children(state.data)}</>
}

export const tableCellClass = 'border-b border-line px-3 py-2 text-left align-top text-sm'
export const tableHeadClass = 'border-b border-line bg-sunken px-3 py-2 text-left text-xs font-semibold uppercase text-ink-muted'
