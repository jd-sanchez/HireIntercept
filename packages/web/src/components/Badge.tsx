import type { ReactNode } from 'react'
import { DraftStatus, EligibilityStatus } from '@hireintercept/core/types'
import './Badge.css'

export enum Tone {
  Neutral = 'neutral',
  Good = 'good',
  Warn = 'warn',
  Bad = 'bad',
  Info = 'info',
}

export const Badge = ({ tone = Tone.Neutral, children }: { tone?: Tone; children: ReactNode }) => (
  <span className="ui-badge" data-tone={tone}>{children}</span>
)

const STATUS_PRESENTATION: Record<EligibilityStatus, { label: string; tone: Tone }> = {
  [EligibilityStatus.Eligible]: { label: 'Eligible', tone: Tone.Good },
  [EligibilityStatus.NeedsVerification]: { label: 'Needs verification', tone: Tone.Warn },
  [EligibilityStatus.Ineligible]: { label: 'Ineligible', tone: Tone.Bad },
}

export const statusLabel = (status: EligibilityStatus) => STATUS_PRESENTATION[status].label

export function StatusBadge({ status }: { status: EligibilityStatus }) {
  const { label, tone } = STATUS_PRESENTATION[status]
  return <Badge tone={tone}>{label}</Badge>
}

export const SyntheticBadge = () => <Badge tone={Tone.Info}>Synthetic data</Badge>

export const DRAFT_STATUS_LABEL: Record<DraftStatus, string> = {
  [DraftStatus.Ready]: 'Draft (never sent)',
  [DraftStatus.HeldPendingVerification]: 'Held pending verification',
}
