import './Score.css'

export const ScoreBar = ({ percent }: { percent: number }) => (
  <div className="ui-score-bar" role="presentation">
    <div className="ui-score-bar__fill" style={{ width: `${percent}%` }} />
  </div>
)

export const ScoreRing = ({ value, label }: { value: number; label: string }) => (
  <div className="ui-score-ring" role="img" aria-label={label}>
    <svg viewBox="0 0 36 36">
      <circle className="ui-score-ring__track" cx="18" cy="18" r="15.9155" pathLength="100" />
      <circle className="ui-score-ring__value" cx="18" cy="18" r="15.9155" pathLength="100" strokeDasharray={`${value} 100`} />
    </svg>
    <span className="ui-score-ring__number">{value}</span>
  </div>
)
