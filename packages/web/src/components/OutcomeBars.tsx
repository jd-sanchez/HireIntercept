import { roundedShare } from '@hireintercept/core/math'
import './OutcomeBars.css'

export enum OutcomeTone {
  Primary = 'primary',
  Soft = 'soft',
  Muted = 'muted',
}

export interface OutcomeSegment {
  label: string
  count: number
  tone: OutcomeTone
}

export interface OutcomeRow {
  label: string
  caption?: string
  segments: OutcomeSegment[]
}

interface OutcomeBarsProps {
  rows: OutcomeRow[]
  legend: { label: string; tone: OutcomeTone }[]
}

const shareOf = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

const summarize = (segments: OutcomeSegment[]) =>
  segments.filter((segment) => segment.count > 0).map((segment) => `${segment.count} ${segment.label.toLowerCase()}`).join(' · ')

export function OutcomeBars({ rows, legend }: OutcomeBarsProps) {
  return (
    <div className="ui-outcome">
      <div className="ui-outcome__legend">
        {legend.map((entry) => (
          <span key={entry.label}><i className="ui-outcome__swatch" data-tone={entry.tone} />{entry.label}</span>
        ))}
      </div>
      {rows.map((row) => {
        const total = row.segments.reduce((running, segment) => running + segment.count, 0)
        return (
          <div key={row.label} className="ui-outcome__row">
            <div className="ui-outcome__label">
              <span>{row.label}</span>
              {row.caption && <small>{row.caption}</small>}
            </div>
            <div className="ui-outcome__bar" role="img" aria-label={`${row.label}: ${summarize(row.segments)}`}>
              {row.segments.map((segment) => (
                <span
                  key={segment.label}
                  className="ui-outcome__segment ui-grow"
                  data-tone={segment.tone}
                  style={{ width: `${shareOf(segment.count, total)}%` }}
                  title={`${segment.count} ${segment.label.toLowerCase()}`}
                >
                  {shareOf(segment.count, total) >= 5 ? segment.count : ''}
                </span>
              ))}
            </div>
            <span className="ui-outcome__summary">{summarize(row.segments)}</span>
          </div>
        )
      })}
    </div>
  )
}
