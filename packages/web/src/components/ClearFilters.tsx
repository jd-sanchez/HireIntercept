import './ClearFilters.css'

interface ClearFiltersProps {
  activeCount: number
  onClear: () => void
}

export function ClearFilters({ activeCount, onClear }: ClearFiltersProps) {
  if (activeCount === 0) return null
  return (
    <button type="button" className="ui-clear ui-enter" onClick={onClear} aria-label={`Clear ${activeCount} active ${activeCount === 1 ? 'filter' : 'filters'}`}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
      Clear filters
      <span className="ui-clear__count">{activeCount}</span>
    </button>
  )
}
