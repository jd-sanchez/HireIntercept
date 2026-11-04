import type { ReactNode } from 'react'
import './Layout.css'

export enum Gap {
  Tight = 'tight',
  Normal = 'normal',
  Loose = 'loose',
}

interface LayoutProps {
  gap?: Gap
  children: ReactNode
}

export const Stack = ({ gap = Gap.Normal, children }: LayoutProps) => (
  <div className="ui-stack" data-gap={gap}>{children}</div>
)

export const Cluster = ({ gap = Gap.Normal, children }: LayoutProps) => (
  <div className="ui-cluster" data-gap={gap}>{children}</div>
)

export const Spread = ({ children }: { children: ReactNode }) => <div className="ui-spread">{children}</div>
