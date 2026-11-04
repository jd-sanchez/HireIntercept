import { roundedShare } from '@hireintercept/core/math'
import './Histogram.css'

export interface HistogramBucket {
  lowerBound: number
  label: string
  count: number
  caption?: string
}

interface HistogramProps {
  buckets: HistogramBucket[]
  activeLowerBound: number | null
  onSelect: (lowerBound: number) => void
}

const shareOf = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

export function Histogram({ buckets, activeLowerBound, onSelect }: HistogramProps) {
  const total = buckets.reduce((running, bucket) => running + bucket.count, 0)
  const largest = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0)
  return (
    <div className="ui-histogram" role="group" aria-label="Score distribution" data-filtering={activeLowerBound !== null}>
      <div className="ui-histogram__row ui-histogram__row--header" aria-hidden="true">
        <span>Score</span>
        <span>Roles</span>
        <span>Share</span>
        <span>Highest scorer</span>
      </div>
      {buckets.map((bucket) => (
        <button
          key={bucket.lowerBound}
          type="button"
          className="ui-histogram__row"
          data-active={activeLowerBound !== null && bucket.lowerBound >= activeLowerBound}
          aria-pressed={bucket.lowerBound === activeLowerBound}
          aria-label={`${bucket.label}: ${bucket.count} roles. Show roles scoring ${bucket.lowerBound} or higher`}
          onClick={() => onSelect(bucket.lowerBound)}
        >
          <span className="ui-histogram__range">{bucket.label}</span>
          <span className="ui-histogram__track"><span className="ui-histogram__bar ui-grow" style={{ width: `${shareOf(bucket.count, largest)}%` }} /></span>
          <span className="ui-histogram__count">{bucket.count}</span>
          <span className="ui-histogram__share">{shareOf(bucket.count, total)}%</span>
          <span className="ui-histogram__caption">{bucket.caption ?? ''}</span>
        </button>
      ))}
    </div>
  )
}
