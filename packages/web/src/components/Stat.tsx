import type { ReactNode } from 'react'
import { Tone } from './Badge'
import './Stat.css'

interface StatProps {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
}

export const Stat = ({ label, value, hint, tone = Tone.Neutral }: StatProps) => (
  <div className="ui-stat" data-tone={tone}>
    <span className="ui-stat__label">{label}</span>
    <span className="ui-stat__value">{value}</span>
    {hint && <span className="ui-stat__hint">{hint}</span>}
  </div>
)

export const StatGrid = ({ children }: { children: ReactNode }) => <div className="ui-stat-grid">{children}</div>
