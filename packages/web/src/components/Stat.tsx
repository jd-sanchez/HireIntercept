import type { ReactNode } from 'react'
import { Tone } from './Badge'
import './Stat.css'

export interface StatSplit {
  first: number
  second: number
}

interface StatProps {
  label: string
  value: ReactNode
  hint?: string
  sharePercent?: number
  featured?: boolean
  split?: StatSplit
  tone?: Tone
  selected?: boolean
  onSelect?: () => void
}

export function Stat({ label, value, hint, sharePercent, featured = false, split, tone = Tone.Neutral, selected = false, onSelect }: StatProps) {
  const content = (
    <>
      <span className="ui-stat__label"><i className="ui-stat__dot" aria-hidden="true" />{label}</span>
      <span className="ui-stat__value">{value}</span>
      {hint && <span className="ui-stat__hint">{hint}</span>}
      {split && (
        <span className="ui-stat__split" aria-label={`A ${split.first}, B ${split.second}`}>
          <span className="ui-stat__arm" data-side="first"><i aria-hidden="true" />A <b>{split.first}</b></span>
          <span className="ui-stat__arm" data-side="second"><i aria-hidden="true" />B <b>{split.second}</b></span>
        </span>
      )}
      {sharePercent !== undefined && (
        <span className="ui-stat__share" role="presentation"><span className="ui-stat__share-fill ui-grow" style={{ width: `${sharePercent}%` }} /></span>
      )}
    </>
  )
  return onSelect ? (
    <button type="button" className="ui-stat ui-stat--action" data-featured={featured} data-tone={tone} data-selected={selected} aria-pressed={selected} onClick={onSelect}>{content}</button>
  ) : (
    <div className="ui-stat" data-featured={featured} data-tone={tone}>{content}</div>
  )
}

export const StatGrid = ({ children }: { children: ReactNode }) => <div className="ui-stat-grid">{children}</div>
