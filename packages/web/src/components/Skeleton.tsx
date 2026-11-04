import './Skeleton.css'

export const Skeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="ui-skeleton" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, position) => <div key={position} className="ui-skeleton__row" />)}
  </div>
)
