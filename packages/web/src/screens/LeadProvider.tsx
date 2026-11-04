import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { OpportunityListItem } from '@hireintercept/core/types'
import { useApi } from '../api'
import { LeadDrawer } from './LeadDrawer'

interface LeadContextValue {
  allOpportunities: OpportunityListItem[] | null
  openLead: (opportunityId: string) => void
  openPosting: (postingId: string) => void
  canOpenPosting: (postingId: string) => boolean
}

const LeadContext = createContext<LeadContextValue | null>(null)

export function LeadProvider({ children }: { children: ReactNode }) {
  const list = useApi<OpportunityListItem[]>('/api/opportunities')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const opportunityIdByPosting = useMemo(
    () => new Map((list.data ?? []).flatMap((item) => item.sourcePostingIds.map((postingId): [string, string] => [postingId, item.id]))),
    [list.data],
  )

  const value = useMemo<LeadContextValue>(
    () => ({
      allOpportunities: list.data,
      openLead: setSelectedId,
      openPosting: (postingId) => {
        const opportunityId = opportunityIdByPosting.get(postingId)
        if (opportunityId) setSelectedId(opportunityId)
      },
      canOpenPosting: (postingId) => opportunityIdByPosting.has(postingId),
    }),
    [list.data, opportunityIdByPosting],
  )

  return (
    <LeadContext value={value}>
      {children}
      {selectedId && <LeadDrawer opportunityId={selectedId} onClose={() => setSelectedId(null)} />}
    </LeadContext>
  )
}

export function useLeads(): LeadContextValue {
  const context = useContext(LeadContext)
  if (!context) throw new Error('useLeads must be used inside LeadProvider')
  return context
}
