import type { ReactNode } from 'react'
import { Text, TextVariant } from './Text'
import './Card.css'

export const Card = ({ inset = false, children }: { inset?: boolean; children: ReactNode }) => (
  <div className="ui-card" data-inset={inset}>{children}</div>
)

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="ui-card">
    <div className="ui-card__title"><Text as="h2" variant={TextVariant.Eyebrow}>{title}</Text></div>
    {children}
  </section>
)
