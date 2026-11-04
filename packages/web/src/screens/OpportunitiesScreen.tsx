import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { EligibilityStatus, type FilterOptions, type OpportunityListItem } from '@hireintercept/core/types'
import { useApi } from '../api'
import { Badge, StatusBadge, Tone, tableCellClass, tableHeadClass } from '../components/ui'
import { ImportSection } from './ImportSection'
import { LeadDrawer } from './LeadDrawer'

const STATUS_OPTIONS = Object.values(EligibilityStatus)
const fieldClass = 'rounded border border-line-strong bg-surface px-2 py-1 text-sm'

const SORT_ARIA: Record<string, 'ascending' | 'descending'> = { asc: 'ascending', desc: 'descending' }

function activateOnKey(event: KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

function BestCandidateCell({ item }: { item: OpportunityListItem }) {
  if (item.bestCandidate) {
    const { candidateId, verified, coveragePercent, proposedToLeads } = item.bestCandidate
    return (
      <span className="space-x-1">
        <span>{candidateId}</span>
        <Badge tone={verified ? Tone.Good : Tone.Warn}>{verified ? 'verified' : `unverified · ${coveragePercent}%`}</Badge>
        {proposedToLeads > 1 && <Badge tone={Tone.Warn}>Proposed to {proposedToLeads} leads</Badge>}
      </span>
    )
  }
  const isIneligible = item.status === EligibilityStatus.Ineligible
  return <span className="text-ink-muted italic">{isIneligible ? 'Not matched: ineligible' : 'No candidate in pool'}</span>
}

export function OpportunitiesScreen() {
  const filterOptions = useApi<FilterOptions>('/api/filters')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [minScore, setMinScore] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const hasFilters = Boolean(industry || role || status || minScore)
  const clearFilters = () => {
    setIndustry('')
    setRole('')
    setStatus('')
    setMinScore('')
  }

  const query = new URLSearchParams({ industry, role, status, minScore }).toString()
  const opportunities = useApi<OpportunityListItem[]>(`/api/opportunities?${query}`)

  const columns = useMemo<ColumnDef<OpportunityListItem>[]>(
    () => [
      { accessorKey: 'company', header: 'Company' },
      { accessorKey: 'role', header: 'Role' },
      { accessorKey: 'industry', header: 'Industry' },
      { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: 'score',
        header: 'Score',
        accessorFn: (item) => item.score ?? -1,
        cell: ({ row }) =>
          row.original.score === null ? (
            <span className="text-ink-muted italic">{row.original.notScoredReason}</span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold tabular-nums">{row.original.score}</span>
              {row.original.provisional && <Badge tone={Tone.Warn}>provisional</Badge>}
            </span>
          ),
      },
      {
        id: 'bestCandidate',
        header: 'Best candidate',
        accessorFn: (item) => item.bestCandidate?.candidateId ?? '',
        cell: ({ row }) => <BestCandidateCell item={row.original} />,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: opportunities.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div>
      <ImportSection />
      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">Industry
          <select className={fieldClass} value={industry} onChange={(event) => setIndustry(event.target.value)}>
            <option value="">All</option>
            {filterOptions.data?.industries.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Role
          <select className={fieldClass} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All</option>
            {filterOptions.data?.roles.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Eligibility
          <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry.replace('_', ' ')}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Min score
          <input className={`${fieldClass} w-24`} type="number" min={0} max={100} value={minScore} onChange={(event) => setMinScore(event.target.value)} />
        </label>
        {hasFilters && <button className="pb-1 text-accent underline-offset-2 hover:underline" onClick={clearFilters}>Clear filters</button>}
        <span className="pb-1 text-ink-muted">{opportunities.data?.length ?? 0} opportunities · click a header to sort, a row for detail</span>
      </div>
      {opportunities.error && <p className="rounded bg-bad-soft p-3 text-sm text-bad-ink">Could not load data: {opportunities.error}</p>}
      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`${tableHeadClass} cursor-pointer select-none`}
                    tabIndex={0}
                    aria-sort={SORT_ARIA[header.column.getIsSorted() as string] ?? 'none'}
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(event) => activateOnKey(event, () => header.column.toggleSorting())}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-sunken focus-visible:bg-sunken"
                tabIndex={0}
                onClick={() => setSelectedId(row.original.id)}
                onKeyDown={(event) => activateOnKey(event, () => setSelectedId(row.original.id))}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={tableCellClass}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedId && <LeadDrawer opportunityId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
