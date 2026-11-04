import type { ReactNode } from 'react'
import { Text, TextTone, TextVariant } from './Text'
import './Card.css'

export const Card = ({ inset = false, children }: { inset?: boolean; children: ReactNode }) => (
  <div className="ui-card" data-inset={inset}>{children}</div>
)

interface SectionProps {
  title?: string
  eyebrow?: string
  description?: string
  aside?: string
  children: ReactNode
}

export const Section = ({ title, eyebrow, description, aside, children }: SectionProps) => (
  <section className="ui-card">
    <div className="ui-card__header">
      <div className="ui-card__title">
        {eyebrow && <Text as="span" variant={TextVariant.Eyebrow}>{eyebrow}</Text>}
        {title && <Text as="h2" variant={TextVariant.Heading}>{title}</Text>}
        {description && <Text tone={TextTone.Muted}>{description}</Text>}
      </div>
      {aside && <span className="ui-card__aside">{aside}</span>}
    </div>
    {children}
  </section>
)
