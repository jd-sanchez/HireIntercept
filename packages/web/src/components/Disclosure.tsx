import { useState, type ReactNode } from 'react'
import './Disclosure.css'

interface DisclosureProps {
  title: string
  summary?: ReactNode
  children: ReactNode
}

export function Disclosure({ title, summary, children }: DisclosureProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ui-disclosure">
      <button type="button" className="ui-disclosure__trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="ui-disclosure__chevron" aria-hidden="true">▸</span>
        <span className="ui-disclosure__title">{title}</span>
        {summary && <span className="ui-disclosure__summary">{summary}</span>}
      </button>
      <div className="ui-disclosure__panel" data-open={open} inert={!open}>
        <div className="ui-disclosure__body">{children}</div>
      </div>
    </div>
  )
}
