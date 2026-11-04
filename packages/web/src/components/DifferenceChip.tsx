import './DifferenceChip.css'

export type DifferenceSide = 'first' | 'second'

interface DifferenceChipProps {
  side: DifferenceSide
  amount: number
}

export const DifferenceChip = ({ side, amount }: DifferenceChipProps) => (
  <span className="ui-difference" data-side={side} aria-label={`${side === 'first' ? 'A' : 'B'} ahead by ${amount}`}>
    <span className="ui-difference__side">{side === 'first' ? 'A' : 'B'}</span>
    <span className="ui-difference__amount">+{amount}</span>
  </span>
)
