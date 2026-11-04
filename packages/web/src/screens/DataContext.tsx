import type { SequenceReport } from '@hireintercept/core/sequences'
import { useApi } from '../api'
import { Text, TextTone, TextVariant } from '../components/Text'

export function DataContext() {
  const state = useApi<SequenceReport>('/api/sequences')
  const asOf = state.data ? ` · as of day ${state.data.asOfDay} (latest event)` : ''
  return <Text variant={TextVariant.Small} tone={TextTone.Muted}>Synthetic dataset · static snapshot{asOf}</Text>
}
