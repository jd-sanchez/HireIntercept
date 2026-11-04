import type { ReactNode } from 'react'
import type { ApiState } from '../api'
import { Button } from './Button'
import { Callout } from './Callout'
import { Cluster } from './Layout'
import { Tone } from './Badge'
import { Skeleton } from './Skeleton'
import './ApiBoundary.css'

interface ApiBoundaryProps<Data> {
  state: ApiState<Data>
  children: (data: Data) => ReactNode
}

export function ApiBoundary<Data>({ state, children }: ApiBoundaryProps<Data>) {
  if (state.error) {
    return (
      <Callout tone={Tone.Bad}>
        <Cluster>
          <span>Could not load data: {state.error}</span>
          <Button onClick={state.reload}>Retry</Button>
        </Cluster>
      </Callout>
    )
  }
  if (!state.data) return <Skeleton />
  return <div className="ui-boundary" data-refreshing={state.loading}>{children(state.data)}</div>
}
