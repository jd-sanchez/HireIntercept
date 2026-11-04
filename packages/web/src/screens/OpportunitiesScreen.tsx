import { useMemo, useState } from 'react'
import { EligibilityStatus, type FilterOptions, type ImportSummary, type OpportunityListItem } from '@hireintercept/core/types'
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
import { roundedShare } from '@hireintercept/core/math'
import { Text, TextTone, TextVariant } from '../components/Text'
import { ImportDetails } from './ImportOverview'
import { useLeads } from './LeadProvider'
import { DataContext } from './DataContext'
import './OpportunitiesScreen.css'

const BUCKET_WIDTH = 10

enum QuickFilter {
  Ready = 'ready',
  ConfirmHours = 'confirm_hours',
}

const share = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

const hasVerifiedCandidate = (item: OpportunityListItem) => item.status === EligibilityStatus.Eligible && item.bestCandidate?.verified === true

const QUICK_FILTER_MATCHES: Record<QuickFilter, (item: OpportunityListItem) => boolean> = {
  [QuickFilter.Ready]: (item) => hasVerifiedCandidate(item) && item.bestCandidate?.confirmHours === false,
  [QuickFilter.ConfirmHours]: (item) => hasVerifiedCandidate(item) && item.bestCandidate?.confirmHours === true,
}

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

const ELIGIBILITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: QuickFilter.Ready, label: 'Ready to contact' },
  { value: QuickFilter.ConfirmHours, label: 'Confirm hours first' },
  { value: EligibilityStatus.Eligible, label: 'All eligible' },
  { value: EligibilityStatus.NeedsVerification, label: 'Needs verification' },
  { value: EligibilityStatus.Ineligible, label: 'Ineligible' },
]

const toOptions = (entries: string[] | undefined) => [{ value: '', label: 'All' }, ...(entries ?? []).map((entry) => ({ value: entry, label: entry }))]

function BestCandidateCell({ item }: { item: OpportunityListItem }) {
  if (!item.bestCandidate) {
    const isIneligible = item.status === EligibilityStatus.Ineligible
    return <Text variant={TextVariant.Small} tone={TextTone.Muted} italic>{isIneligible ? 'Not matched: ineligible' : 'No candidate in pool'}</Text>
  }
  const { candidateId, verified, confirmHours, gaps, coveragePercent, proposedToLeads } = item.bestCandidate
  return (
    <Stack gap={Gap.Tight}>
      <Cluster gap={Gap.Tight}>
        <Text strong>{candidateId}</Text>
        <Text as="span" variant={TextVariant.Small} tone={verified ? TextTone.Good : TextTone.Warn} strong>
          {verified ? (confirmHours ? 'Verified (need to confirm hours)' : 'Verified') : `Unverified (${gaps.join(', ')})`}
        </Text>
      </Cluster>
      {!verified && <Text variant={TextVariant.Small} tone={TextTone.Muted}>{coveragePercent}% skill match</Text>}
      {proposedToLeads > 1 && <Text variant={TextVariant.Small} tone={TextTone.Muted}>Also proposed to {proposedToLeads - 1} other jobs</Text>}
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
      header: 'Job',
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
  const importSummary = useApi<ImportSummary>('/api/import-summary')
  const [industry, setIndustry] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [minScore, setMinScore] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)
  const { allOpportunities, openLead } = useLeads()

  const activeFilterCount = [industry, role, status, minScore].filter(Boolean).length + (quickFilter ? 1 : 0)
  const hasFilters = activeFilterCount > 0
  const selectStatusTile = (nextStatus: string) => {
    setQuickFilter(null)
    setStatus(nextStatus)
  }
  const toggleQuickFilter = (nextFilter: QuickFilter) => {
    setStatus('')
    setQuickFilter((current) => (current === nextFilter ? null : nextFilter))
  }
  const selectEligibility = (value: string) => {
    const pickedQuickFilter = Object.values(QuickFilter).find((entry) => entry === value)
    if (!pickedQuickFilter) return selectStatusTile(value)
    setStatus('')
    setQuickFilter(pickedQuickFilter)
  }
  const clearFilters = () => {
    setIndustry('')
    setRole('')
    setStatus('')
    setMinScore('')
    setQuickFilter(null)
  }

  const query = new URLSearchParams({ industry, role, status, minScore }).toString()
  const opportunities = useApi<OpportunityListItem[]>(`/api/opportunities?${query}`)
  const visibleCount = quickFilter ? (opportunities.data ?? []).filter(QUICK_FILTER_MATCHES[quickFilter]).length : (opportunities.data?.length ?? 0)
  const industryOptions = useMemo(() => toOptions(filterOptions.data?.industries), [filterOptions.data])
  const roleOptions = useMemo(() => toOptions(filterOptions.data?.roles), [filterOptions.data])

  const readyCount = (allOpportunities ?? []).filter(QUICK_FILTER_MATCHES[QuickFilter.Ready]).length
  const confirmHoursCount = (allOpportunities ?? []).filter(QUICK_FILTER_MATCHES[QuickFilter.ConfirmHours]).length
  const needsVerificationCount = (allOpportunities ?? []).filter((item) => item.status === EligibilityStatus.NeedsVerification).length
  const ineligibleCount = (allOpportunities ?? []).filter((item) => item.status === EligibilityStatus.Ineligible).length
  const selectStatus = (target: EligibilityStatus) => selectStatusTile(status === target ? '' : target)
  const tiles = [
    { label: 'Ready to contact', count: readyCount, note: 'verified candidate, hours known', tone: Tone.Good, selected: quickFilter === QuickFilter.Ready, onSelect: () => toggleQuickFilter(QuickFilter.Ready) },
    { label: 'Confirm hours first', count: confirmHoursCount, note: 'verified candidate, hours not stated', tone: Tone.Info, selected: quickFilter === QuickFilter.ConfirmHours, onSelect: () => toggleQuickFilter(QuickFilter.ConfirmHours) },
    { label: 'Needs verification', count: needsVerificationCount, note: 'eligibility unclear', tone: Tone.Warn, selected: status === EligibilityStatus.NeedsVerification, onSelect: () => selectStatus(EligibilityStatus.NeedsVerification) },
    { label: 'Ineligible', count: ineligibleCount, note: 'U.S.-only or on-site', tone: Tone.Bad, selected: status === EligibilityStatus.Ineligible, onSelect: () => selectStatus(EligibilityStatus.Ineligible) },
  ]
  const scoreBuckets = useMemo(() => buildScoreBuckets(allOpportunities ?? []), [allOpportunities])
  const peakBucket = scoreBuckets.reduce<HistogramBucket | undefined>((peak, bucket) => (!peak || bucket.count > peak.count ? bucket : peak), undefined)
  const headline = allOpportunities
    ? `${readyCount} jobs are ready to contact now; ${confirmHoursCount} more need working hours confirmed, and ${needsVerificationCount} need eligibility verified before any outreach.`
    : 'Remote jobs ranked by how well we can fill them.'

  return (
    <Stack gap={Gap.Loose}>
      <Spread>
        <Stack gap={Gap.Tight}>
          <Text as="h1" variant={TextVariant.Title}>Jobs</Text>
          <Text tone={TextTone.Soft}>{headline}</Text>
          <DataContext />
        </Stack>
        <ApiBoundary state={importSummary}>{(summary) => <ImportDetails summary={summary} />}</ApiBoundary>
      </Spread>

      {allOpportunities && (
        <div className="job-tiles">
          {tiles.map((tile) => (
            <Stat
              key={tile.label}
              label={tile.label}
              value={tile.count}
              hint={`${share(tile.count, allOpportunities.length)}% of jobs · ${tile.note}`}
              sharePercent={share(tile.count, allOpportunities.length)}
              tone={tile.tone}
              selected={tile.selected}
              onSelect={tile.onSelect}
            />
          ))}
        </div>
      )}

      {peakBucket && (
        <Section
          title="Score distribution"
          description="How many scored jobs fall in each score range. Click a row to show jobs scoring that or higher."
          aside={`Most jobs score ${peakBucket.label}`}
        >
          <Histogram
            buckets={scoreBuckets}
            activeLowerBound={minScore === '' ? null : Number(minScore)}
            onSelect={(lowerBound) => setMinScore(String(minScore === String(lowerBound) ? '' : lowerBound))}
          />
        </Section>
      )}

      <Section
        title="Ranked jobs"
        description="Click a row for the score breakdown, candidate matches and outreach drafts. Click a column header to re-sort."
        aside={hasFilters ? `${visibleCount} jobs match your filters` : `All ${visibleCount} jobs, highest score first`}
      >
        <Stack>
          <div className="filter-bar">
            <Field label="Industry"><Select value={industry} options={industryOptions} onChange={setIndustry} /></Field>
            <Field label="Role"><Select value={role} options={roleOptions} onChange={setRole} /></Field>
            <Field label="Eligibility"><Select value={quickFilter ?? status} options={ELIGIBILITY_OPTIONS} onChange={selectEligibility} /></Field>
            <Field label="Min score"><NumberInput value={minScore} min={0} max={100} onChange={setMinScore} /></Field>
            <ClearFilters activeCount={activeFilterCount} onClear={clearFilters} />
          </div>
          <ApiBoundary state={opportunities}>
            {(items) => {
              const rows = quickFilter ? items.filter(QUICK_FILTER_MATCHES[quickFilter]) : items
              return (
                <DataTable
                  columns={buildColumns(rankByScore(rows))}
                  rows={rows}
                  getRowKey={(item) => item.id}
                  onRowActivate={(item) => openLead(item.id)}
                  initialSort={{ columnId: 'score', descending: true }}
                  emptyMessage="No jobs match these filters. Clear a filter to widen the search."
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
