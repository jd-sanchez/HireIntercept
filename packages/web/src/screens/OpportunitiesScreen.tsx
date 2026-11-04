import { useMemo, useState } from 'react'
import { EligibilityStatus, type FilterOptions, type OpportunityListItem } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { Badge, StatusBadge, Tone } from '../components/Badge'
import { Button, ButtonVariant } from '../components/Button'
import { Card } from '../components/Card'
import { ColumnAlign, DataTable, type Column } from '../components/DataTable'
import { Field, NumberInput, Select } from '../components/Field'
import { Cluster, Gap, Spread, Stack } from '../components/Layout'
import { ScoreBar } from '../components/Score'
import { Text, TextTone, TextVariant } from '../components/Text'
import { ImportOverview } from './ImportOverview'
import { LeadDrawer } from './LeadDrawer'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  ...Object.values(EligibilityStatus).map((entry) => ({ value: entry, label: entry.replace('_', ' ') })),
]

const toOptions = (entries: string[] | undefined) => [{ value: '', label: 'All' }, ...(entries ?? []).map((entry) => ({ value: entry, label: entry }))]

function BestCandidateCell({ item }: { item: OpportunityListItem }) {
  if (!item.bestCandidate) {
    const isIneligible = item.status === EligibilityStatus.Ineligible
    return <Text variant={TextVariant.Small} tone={TextTone.Muted} italic>{isIneligible ? 'Not matched: ineligible' : 'No candidate in pool'}</Text>
  }
  const { candidateId, verified, coveragePercent, proposedToLeads } = item.bestCandidate
  return (
    <Stack gap={Gap.Tight}>
      <Text strong>{candidateId}</Text>
      <Cluster gap={Gap.Tight}>
        <Badge tone={verified ? Tone.Good : Tone.Warn}>{verified ? 'Verified' : `Unverified · ${coveragePercent}%`}</Badge>
        {proposedToLeads > 1 && <Badge tone={Tone.Warn}>Proposed to {proposedToLeads} leads</Badge>}
      </Cluster>
    </Stack>
  )
}

const COLUMNS: Column<OpportunityListItem>[] = [
  {
    id: 'company',
    header: 'Company',
    sortValue: (item) => item.company,
    render: (item) => (
      <Stack gap={Gap.Tight}>
        <Text strong>{item.company}</Text>
        <Text variant={TextVariant.Small} tone={TextTone.Muted}>{item.industry}</Text>
      </Stack>
    ),
  },
  { id: 'role', header: 'Role', sortValue: (item) => item.role, render: (item) => item.role },
  { id: 'status', header: 'Status', sortValue: (item) => item.status, render: (item) => <StatusBadge status={item.status} /> },
  {
    id: 'score',
    header: 'Score',
    width: '9rem',
    sortValue: (item) => item.score ?? -1,
    render: (item) =>
      item.score === null ? (
        <Text variant={TextVariant.Small} tone={TextTone.Muted} italic>{item.notScoredReason}</Text>
      ) : (
        <Stack gap={Gap.Tight}>
          <Cluster gap={Gap.Tight}>
            <Text variant={TextVariant.Heading}>{item.score}</Text>
            {item.provisional && <Badge tone={Tone.Warn}>provisional</Badge>}
          </Cluster>
          <ScoreBar percent={item.score} />
        </Stack>
      ),
  },
  { id: 'bestCandidate', header: 'Best candidate', sortValue: (item) => item.bestCandidate?.candidateId ?? '', render: (item) => <BestCandidateCell item={item} />, align: ColumnAlign.Start },
]

export function OpportunitiesScreen() {
  const filterOptions = useApi<FilterOptions>('/api/filters')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [minScore, setMinScore] = useState('')
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
  const industryOptions = useMemo(() => toOptions(filterOptions.data?.industries), [filterOptions.data])
  const roleOptions = useMemo(() => toOptions(filterOptions.data?.roles), [filterOptions.data])

  return (
    <Stack gap={Gap.Loose}>
      <Stack gap={Gap.Tight}>
        <Text as="h1" variant={TextVariant.Title}>Opportunities</Text>
        <Text tone={TextTone.Soft}>Remote roles ranked by how well we can fill them. Select a row for the full breakdown.</Text>
      </Stack>

      <ImportOverview />

      <Card>
        <Stack>
          <Spread>
            <Cluster gap={Gap.Normal}>
              <Field label="Industry"><Select value={industry} options={industryOptions} onChange={setIndustry} /></Field>
              <Field label="Role"><Select value={role} options={roleOptions} onChange={setRole} /></Field>
              <Field label="Eligibility"><Select value={status} options={STATUS_OPTIONS} onChange={setStatus} /></Field>
              <Field label="Min score"><NumberInput value={minScore} min={0} max={100} onChange={setMinScore} /></Field>
              {hasFilters && <Button variant={ButtonVariant.Ghost} onClick={clearFilters}>Clear filters</Button>}
            </Cluster>
            <Text variant={TextVariant.Small} tone={TextTone.Muted}>{opportunities.data?.length ?? 0} opportunities</Text>
          </Spread>
          <ApiBoundary state={opportunities}>
            {(items) => (
              <DataTable
                columns={COLUMNS}
                rows={items}
                getRowKey={(item) => item.id}
                onRowActivate={(item) => setSelectedId(item.id)}
                initialSort={{ columnId: 'score', descending: true }}
                emptyMessage="No opportunities match these filters. Clear a filter to widen the search."
                minWidth="44rem"
              />
            )}
          </ApiBoundary>
        </Stack>
      </Card>

      {selectedId && <LeadDrawer opportunityId={selectedId} onClose={() => setSelectedId(null)} />}
    </Stack>
  )
}
