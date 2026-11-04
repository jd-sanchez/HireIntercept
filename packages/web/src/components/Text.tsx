import type { ReactNode } from 'react'
import './Text.css'

export enum TextVariant {
  Title = 'title',
  Heading = 'heading',
  Body = 'body',
  Small = 'small',
  Eyebrow = 'eyebrow',
}

export enum TextTone {
  Default = 'default',
  Soft = 'soft',
  Muted = 'muted',
  Good = 'good',
  Warn = 'warn',
  Bad = 'bad',
}

interface TextProps {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'pre'
  variant?: TextVariant
  tone?: TextTone
  italic?: boolean
  strong?: boolean
  children: ReactNode
}

export function Text({ as: Element = 'p', variant = TextVariant.Body, tone = TextTone.Default, italic = false, strong = false, children }: TextProps) {
  return (
    <Element className="ui-text" data-variant={variant} data-tone={tone} data-italic={italic} data-strong={strong}>
      {children}
    </Element>
  )
}

export const BulletList = ({ items }: { items: ReactNode[] }) => (
  <ul className="ui-bullets">
    {items.map((item, position) => <li key={position}>{item}</li>)}
  </ul>
)
