import { useMemo, useState } from 'react'
import { EligibilityStatus, type FilterOptions, type OpportunityListItem } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { StatusBadge, Tone } from '../components/Badge'
import { ClearFilters } from '../components/ClearFilters'
import { ColumnAlign, DataTable, type Column } from '../components/DataTable'
import { Field, NumberInput, Select } from '../components/Field'
import { Cluster, Gap, Spread, Stack } from '../components/Layout'
import { Histogram, type HistogramBucket } from '../components/Histogram'
import { ScoreBar } from '../components/Score'
import { Section } from '../components/Card'
import { Stat } from '../components/Stat'
import { Text, TextTone, TextVariant } from '../components/Text'
import { ImportOverview } from './ImportOverview'
import { useLeads } from './LeadProvider'
import { DataContext } from './DataContext'
import './OpportunitiesScreen.css'

const BUCKET_WIDTH = 10
const READY_TILE = 'ready'

const isReadyToContact = (item: OpportunityListItem) => item.status === EligibilityStatus.Eligible && item.bestCandidate?.verified === true

function buildScoreBuckets(items: OpportunityListItem[]): HistogramBucket[] {
  const itemsByLowerBound = items.reduce((groups, item) => {
    if (item.score === null) return groups
    const lowerBound = Math.floor(item.score / BUCKET_WIDTH) * BUCKET_WIDTH
    return groups.set(lowerBound, [...(groups.get(lowerBound) ?? []), item])
  }, new Map<number, OpportunityListItem[]>())
  const lowerBounds = [...itemsByLowerBound.keys()]
  if (lowerBounds.length === 0) return []
  const first = Math.min(...lowerBounds)
  const last = Math.max(...lowerBounds)
  return Array.from({ length: (last - first) / BUCKET_WIDTH + 1 }, (_, position) => {
    const lowerBound = first + position * BUCKET_WIDTH
    const bucketItems = itemsByLowerBound.get(lowerBound) ?? []
    const top = bucketItems.reduce<OpportunityListItem | undefined>((best, item) => (!best || (item.score ?? 0) > (best.score ?? 0) ? item : best), undefined)
    return {
      lowerBound,
      label: `${lowerBound}–${lowerBound + BUCKET_WIDTH - 1}`,
      count: bucketItems.length,
      caption: top ? `${top.company} (${top.score})` : undefined,
    }
  })
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  ...Object.values(EligibilityStatus).map((entry) => ({ value: entry, label: entry.charAt(0).toUpperCase() + entry.slice(1).replace('_', ' ') })),
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
      <Cluster gap={Gap.Tight}>
        <Text strong>{candidateId}</Text>
        <Text as="span" variant={TextVariant.Small} tone={verified ? TextTone.Good : TextTone.Warn} strong>
          {verified ? 'Verified' : `Unverified · ${coveragePercent}%`}
        </Text>
      </Cluster>
      {proposedToLeads > 1 && <Text variant={TextVariant.Small} tone={TextTone.Muted}>Also proposed to {proposedToLeads - 1} other leads</Text>}
    </Stack>
  )
}

function buildColumns(rankById: Map<string, number>): Column<OpportunityListItem>[] {
  return [
    {
      id: 'rank',
      header: '#',
      width: '3rem',
      sortValue: (item) => rankById.get(item.id) ?? Number.MAX_SAFE_INTEGER,
      render: (item) => <Text variant={TextVariant.Small} tone={TextTone.Muted} strong>{rankById.get(item.id) ?? '—'}</Text>,
    },
    {
      id: 'lead',
      header: 'Lead',
      sortValue: (item) => item.company,
      render: (item) => (
        <Stack gap={Gap.Tight}>
          <Text strong>{item.company}</Text>
          <Text variant={TextVariant.Small} tone={TextTone.Soft}>{item.role}</Text>
        </Stack>
      ),
    },
    { id: 'industry', header: 'Industry', sortValue: (item) => item.industry, render: (item) => <Text variant={TextVariant.Small} tone={TextTone.Soft}>{item.industry}</Text> },
    { id: 'status', header: 'Eligibility', sortValue: (item) => item.status, render: (item) => <StatusBadge status={item.status} /> },
    {
      id: 'score',
      header: 'Score',
      width: '11rem',
      sortValue: (item) => item.score ?? -1,
      render: (item) =>
        item.score === null ? (
          <Text variant={TextVariant.Small} tone={TextTone.Muted} italic>{item.notScoredReason}</Text>
        ) : (
          <Stack gap={Gap.Tight}>
            <div className="score-cell">
              <Text variant={TextVariant.Heading}>{item.score}</Text>
              <ScoreBar percent={item.score} />
            </div>
            {item.provisional && <Text variant={TextVariant.Small} tone={TextTone.Warn}>Provisional: needs verification</Text>}
          </Stack>
        ),
    },
    { id: 'bestCandidate', header: 'Best candidate', sortValue: (item) => item.bestCandidate?.candidateId ?? '', render: (item) => <BestCandidateCell item={item} />, align: ColumnAlign.Start },
  ]
}

function rankByScore(items: OpportunityListItem[]): Map<string, number> {
  const scored = items.filter((item) => item.score !== null).sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
  return new Map(scored.map((item, position): [string, number] => [item.id, position + 1]))
}

export function OpportunitiesScreen() {
  const filterOptions = useApi<FilterOptions>('/api/filters')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [minScore, setMinScore] = useState('')
  const [readyOnly, setReadyOnly] = useState(false)
  const { allOpportunities, openLead } = useLeads()

  const activeFilterCount = [industry, role, status, minScore].filter(Boolean).length + (readyOnly ? 1 : 0)
  const hasFilters = activeFilterCount > 0
  const selectStatusTile = (nextStatus: string) => {
    setReadyOnly(false)
    setStatus(nextStatus)
  }
  const selectReadyTile = () => {
    setStatus('')
    setReadyOnly(true)
  }
  const clearFilters = () => {
    setIndustry('')
    setRole('')
    setStatus('')
    setMinScore('')
    setReadyOnly(false)
  }

  const query = new URLSearchParams({ industry, role, status, minScore }).toString()
  const opportunities = useApi<OpportunityListItem[]>(`/api/opportunities?${query}`)
  const visibleCount = readyOnly ? (opportunities.data ?? []).filter(isReadyToContact).length : (opportunities.data?.length ?? 0)
  const industryOptions = useMemo(() => toOptions(filterOptions.data?.industries), [filterOptions.data])
  const roleOptions = useMemo(() => toOptions(filterOptions.data?.roles), [filterOptions.data])

  const readyCount = (allOpportunities ?? []).filter(isReadyToContact).length
  const needsVerificationCount = (allOpportunities ?? []).filter((item) => item.status === EligibilityStatus.NeedsVerification).length
  const scoreBuckets = useMemo(() => buildScoreBuckets(allOpportunities ?? []), [allOpportunities])
  const peakBucket = scoreBuckets.reduce<HistogramBucket | undefined>((peak, bucket) => (!peak || bucket.count > peak.count ? bucket : peak), undefined)
  const headline = allOpportunities
    ? `${readyCount} roles are ready to contact now; ${needsVerificationCount} need verification before any outreach.`
    : 'Remote roles ranked by how well we can fill them.'

  return (
    <Stack gap={Gap.Loose}>
      <Stack gap={Gap.Tight}>
        <Text as="h1" variant={TextVariant.Title}>Opportunities</Text>
        <Text tone={TextTone.Soft}>{headline}</Text>
        <DataContext />
      </Stack>

      <ImportOverview
        activeStatus={readyOnly ? READY_TILE : status}
        onSelectStatus={selectStatusTile}
        leadingTile={
          allOpportunities && (
            <Stat
              featured
              label="Ready to contact"
              value={readyCount}
              hint="Eligible roles with a verified candidate · click to show"
              tone={Tone.Good}
              selected={readyOnly}
              onSelect={() => (readyOnly ? setReadyOnly(false) : selectReadyTile())}
            />
          )
        }
      />

      {peakBucket && (
        <Section
          title="Score distribution"
          description="How many scored roles fall in each score range. Click a row to show roles scoring that or higher."
          aside={`Most roles score ${peakBucket.label}`}
        >
          <Histogram
            buckets={scoreBuckets}
            activeLowerBound={minScore === '' ? null : Number(minScore)}
            onSelect={(lowerBound) => setMinScore(String(minScore === String(lowerBound) ? '' : lowerBound))}
          />
        </Section>
      )}

      <Section
        title="Ranked leads"
        description="Click a row for the score breakdown, candidate matches and outreach drafts. Click a column header to re-sort."
        aside={hasFilters ? `${visibleCount} roles match your filters` : `All ${visibleCount} roles, highest score first`}
      >
        <Stack>
          <Spread>
            <Cluster gap={Gap.Normal}>
              <Field label="Industry"><Select value={industry} options={industryOptions} onChange={setIndustry} /></Field>
              <Field label="Role"><Select value={role} options={roleOptions} onChange={setRole} /></Field>
              <Field label="Eligibility"><Select value={status} options={STATUS_OPTIONS} onChange={selectStatusTile} /></Field>
              <Field label="Min score"><NumberInput value={minScore} min={0} max={100} onChange={setMinScore} /></Field>
              <ClearFilters activeCount={activeFilterCount} onClear={clearFilters} />
            </Cluster>
          </Spread>
          <ApiBoundary state={opportunities}>
            {(items) => {
              const rows = readyOnly ? items.filter(isReadyToContact) : items
              return (
                <DataTable
                  columns={buildColumns(rankByScore(rows))}
                  rows={rows}
                  getRowKey={(item) => item.id}
                  onRowActivate={(item) => openLead(item.id)}
                  initialSort={{ columnId: 'score', descending: true }}
                  emptyMessage="No opportunities match these filters. Clear a filter to widen the search."
                  minWidth="48rem"
                  maxHeight="34rem"
                />
              )
            }}
          </ApiBoundary>
        </Stack>
      </Section>
    </Stack>
  )
}
