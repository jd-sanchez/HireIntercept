import type { ReactNode } from 'react'
import './StickyBar.css'

export const StickyBar = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="ui-sticky-bar" role="region" aria-label={label}>{children}</div>
)
