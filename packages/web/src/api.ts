import { useEffect, useState } from 'react'

export interface ApiState<Data> {
  data: Data | null
  error: string | null
  loading: boolean
}

export function useApi<Data>(path: string): ApiState<Data> {
  const [state, setState] = useState<ApiState<Data>>({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true }))
    fetch(path)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`)
        return (await response.json()) as Data
      })
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, error: error instanceof Error ? error.message : 'Request failed', loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return state
}
