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
  [Tone.Neutral]: 'bg-slate-100 text-slate-700',
  [Tone.Good]: 'bg-emerald-100 text-emerald-800',
  [Tone.Warn]: 'bg-amber-100 text-amber-800',
  [Tone.Bad]: 'bg-rose-100 text-rose-800',
  [Tone.Info]: 'bg-sky-100 text-sky-800',
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
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

export function ApiBoundary<Data>({ state, children }: { state: ApiState<Data>; children: (data: Data) => ReactNode }) {
  if (state.error) return <p className="rounded bg-rose-50 p-3 text-sm text-rose-800">Could not load data: {state.error}</p>
  if (!state.data) return <p className="p-3 text-sm text-slate-500">Loading…</p>
  return <>{children(state.data)}</>
}

export const tableCellClass = 'border-b border-slate-100 px-3 py-2 text-left align-top text-sm'
export const tableHeadClass = 'border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500'
