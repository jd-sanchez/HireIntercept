import { roundedShare } from '@hireintercept/core/math'
import './BreakdownBars.css'

export interface BreakdownRow {
  label: string
  count: number
  note?: string
}

const shareOf = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

export function BreakdownBars({ rows }: { rows: BreakdownRow[] }) {
  const total = rows.reduce((running, row) => running + row.count, 0)
  const largest = rows.reduce((max, row) => Math.max(max, row.count), 0)
  return (
    <div className="ui-breakdown">
      {rows.map((row) => (
        <div key={row.label} className="ui-breakdown__row">
          <div className="ui-breakdown__label">
            <span>{row.label}</span>
            {row.note && <small>{row.note}</small>}
          </div>
          <span className="ui-breakdown__track"><span className="ui-breakdown__bar ui-grow" style={{ width: `${shareOf(row.count, largest)}%` }} /></span>
          <span className="ui-breakdown__count">{row.count}</span>
          <span className="ui-breakdown__share">{shareOf(row.count, total)}%</span>
        </div>
      ))}
    </div>
  )
}
