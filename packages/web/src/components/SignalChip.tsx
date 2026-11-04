import './SignalChip.css'

interface SignalChipProps {
  label: string
  first: number
  second: number
}

export const SignalChip = ({ label, first, second }: SignalChipProps) => (
  <span className="ui-signal" aria-label={`${label}: A ${first}, B ${second}`}>
    <span className="ui-signal__label">{label}</span>
    <span className="ui-signal__count" data-side="first" data-zero={first === 0}>{first}</span>
    <span className="ui-signal__count" data-side="second" data-zero={second === 0}>{second}</span>
  </span>
)
