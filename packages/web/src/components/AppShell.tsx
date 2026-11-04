import { useState, type ReactNode } from 'react'
import { Badge, Tone } from './Badge'
import './AppShell.css'

export interface NavItem<Id extends string> {
  id: Id
  label: string
  icon: ReactNode
}

interface AppShellProps<Id extends string> {
  items: NavItem<Id>[]
  activeId: Id
  onNavigate: (id: Id) => void
  children: ReactNode
}

const BurgerIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M3 5.5h14M3 10h14M3 14.5h14" />
  </svg>
)

export function AppShell<Id extends string>({ items, activeId, onNavigate, children }: AppShellProps<Id>) {
  const [railOpen, setRailOpen] = useState(true)
  return (
    <div className="ui-shell" data-rail-open={railOpen}>
      <aside className="ui-shell__rail" inert={!railOpen}>
        <div className="ui-shell__header">
          <div className="ui-shell__brand">
            <span className="ui-shell__mark" aria-hidden="true" />
            HireIntercept
          </div>
          <button type="button" className="ui-shell__burger" aria-label="Close sidebar" aria-expanded={railOpen} onClick={() => setRailOpen(false)}>
            <BurgerIcon />
          </button>
        </div>
        <nav className="ui-shell__nav" aria-label="Primary">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ui-shell__link"
              aria-current={item.id === activeId ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ui-shell__foot"><Badge tone={Tone.Info}>Prototype · synthetic data</Badge></div>
      </aside>
      <main className="ui-shell__main">
        {!railOpen && (
          <button type="button" className="ui-shell__burger ui-shell__burger--reveal" aria-label="Open sidebar" aria-expanded={railOpen} onClick={() => setRailOpen(true)}>
            <BurgerIcon />
          </button>
        )}
        {children}
      </main>
    </div>
  )
}
