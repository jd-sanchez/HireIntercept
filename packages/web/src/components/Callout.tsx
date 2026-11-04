import type { ReactNode } from 'react'
import { Tone } from './Badge'
import './Callout.css'

export const Callout = ({ tone = Tone.Warn, children }: { tone?: Tone; children: ReactNode }) => (
  <div className="ui-callout" data-tone={tone} role="status">{children}</div>
)
