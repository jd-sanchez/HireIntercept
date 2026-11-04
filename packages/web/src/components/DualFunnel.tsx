import { roundedShare, sum } from '@hireintercept/core/math'
import './DualFunnel.css'

export interface DualFunnelStage {
  label: string
  first: number
  second: number
}

interface DualFunnelRow extends DualFunnelStage {
  firstConversion: number | null
  secondConversion: number | null
  gap: number
}

// A gap only counts when both variants had enough contacts at the previous stage; 1 vs 0 is noise
const MIN_STAGE_SAMPLE = 3

const shareOf = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

export function analyzeDualFunnel(stages: DualFunnelStage[]): { rows: DualFunnelRow[]; widest: DualFunnelRow | undefined } {
  const rows = stages.map((stage, position): DualFunnelRow => {
    const previous = stages[position - 1]
    const firstConversion = previous && previous.first > 0 ? shareOf(stage.first, previous.first) : null
    const secondConversion = previous && previous.second > 0 ? shareOf(stage.second, previous.second) : null
    const hasSample = previous !== undefined && previous.first >= MIN_STAGE_SAMPLE && previous.second >= MIN_STAGE_SAMPLE
    const gap = hasSample && firstConversion !== null && secondConversion !== null ? Math.abs(sum([firstConversion, -secondConversion])) : 0
    return { ...stage, firstConversion, secondConversion, gap }
  })
  const widest = rows.reduce<DualFunnelRow | undefined>((best, row) => (row.gap > 0 && (!best || row.gap > best.gap) ? row : best), undefined)
  return { rows, widest }
}

interface DualFunnelProps {
  firstLabel: string
  secondLabel: string
  stages: DualFunnelStage[]
}

const formatConversion = (conversion: number | null, previousCount: number | undefined) =>
  conversion !== null ? `${conversion}%` : previousCount === undefined ? '' : '—'

export function DualFunnel({ firstLabel, secondLabel, stages }: DualFunnelProps) {
  const { rows, widest } = analyzeDualFunnel(stages)
  const largest = rows.reduce((max, row) => Math.max(max, row.first, row.second), 0)
  return (
    <div className="ui-dual">
      <div className="ui-dual__legend">
        <span><i className="ui-dual__swatch" data-side="first" />{firstLabel}</span>
        <span><i className="ui-dual__swatch" data-side="second" />{secondLabel}</span>
        <span className="ui-dual__hint">% = share of the previous stage kept</span>
      </div>
      {rows.map((row, position) => (
        <div key={row.label} className="ui-dual__row" data-hot={row === widest}>
          <div className="ui-dual__label">
            <span>{row.label}</span>
            {row === widest && <small>Biggest gap</small>}
          </div>
          <div className="ui-dual__lines">
            {([['first', row.first, row.firstConversion], ['second', row.second, row.secondConversion]] as const).map(([side, count, conversion]) => (
              <div key={side} className="ui-dual__line">
                <span className="ui-dual__track"><span className="ui-dual__bar ui-grow" data-side={side} style={{ width: `${shareOf(count, largest)}%` }} /></span>
                <span className="ui-dual__value">{count}</span>
                <span className="ui-dual__conversion">{formatConversion(conversion, stages[position - 1]?.first)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
