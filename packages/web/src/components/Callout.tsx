import type { ReactNode } from 'react'
import { Tone } from './Badge'
import './Callout.css'

const ICON_PATHS: Record<Tone, string> = {
  [Tone.Neutral]: 'M8 7v4.5M8 4.6v.1',
  [Tone.Info]: 'M8 7v4.5M8 4.6v.1',
  [Tone.Good]: 'M4.5 8.5l2.4 2.3 4.6-5',
  [Tone.Warn]: 'M8 4.5v4.2M8 11.3v.1',
  [Tone.Bad]: 'M8 4.5v4.2M8 11.3v.1',
}

export const Callout = ({ tone = Tone.Warn, children }: { tone?: Tone; children: ReactNode }) => (
  <div className="ui-callout" data-tone={tone} role="status">
    <span className="ui-callout__icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON_PATHS[tone]} /></svg>
    </span>
    <div className="ui-callout__body">{children}</div>
  </div>
)
