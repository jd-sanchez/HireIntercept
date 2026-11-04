import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import './Drawer.css'

interface DrawerProps {
  label: string
  onClose: () => void
  children: ReactNode
}

const CLOSE_DELAY_MS = 140
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Drawer({ label, onClose, children }: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<number>(undefined)
  const [closing, setClosing] = useState(false)

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, CLOSE_DELAY_MS)
  }

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      window.clearTimeout(closeTimer.current)
      previouslyFocused?.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') return requestClose()
    if (event.key !== 'Tab' || !panelRef.current) return
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
    const first = focusable.at(0)
    const last = focusable.at(-1)
    if (!first || !last) return
    const leavingStart = event.shiftKey && document.activeElement === first
    const leavingEnd = !event.shiftKey && document.activeElement === last
    if (!leavingStart && !leavingEnd) return
    event.preventDefault()
    ;(leavingStart ? last : first).focus()
  }

  return createPortal(
    <div className="ui-drawer__backdrop" data-closing={closing} onClick={requestClose}>
      <aside
        ref={panelRef}
        className="ui-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="ui-drawer__bar"><Button onClick={requestClose}>Close</Button></div>
        {children}
      </aside>
    </div>,
    document.body,
  )
}
