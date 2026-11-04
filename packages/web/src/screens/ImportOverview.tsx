import type { ReactNode } from 'react'
import { EligibilityStatus, type DuplicateGroupSummary, type ImportFileSummary, type ImportSummary } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { roundedShare } from '@hireintercept/core/math'
import { Badge, StatusBadge, Tone } from '../components/Badge'
import { Card } from '../components/Card'
import { DataTable, type Column } from '../components/DataTable'
import { Disclosure } from '../components/Disclosure'
import { Gap, Stack } from '../components/Layout'
import { Stat, StatGrid } from '../components/Stat'
import { BulletList, Text, TextTone, TextVariant } from '../components/Text'

const FILE_LABELS: { key: keyof ImportSummary['files']; label: string }[] = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'events', label: 'Events' },
]

const share = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

const STATUS_TILES = [
  { status: EligibilityStatus.Eligible, label: 'Eligible', tone: Tone.Good },
  { status: EligibilityStatus.NeedsVerification, label: 'Needs verification', tone: Tone.Warn },
  { status: EligibilityStatus.Ineligible, label: 'Ineligible', tone: Tone.Bad },
]

type FieldConflict = DuplicateGroupSummary['fieldConflicts'][number]

const CONFLICT_COLUMNS: Column<FieldConflict>[] = [
  { id: 'field', header: 'Conflicting field', width: '30%', render: (conflict) => <Badge tone={Tone.Warn}>{conflict.field}</Badge> },
  { id: 'values', header: 'Values by posting', render: (conflict) => conflict.values.map((entry) => `${entry.postingId}: ${entry.value}`).join('  |  ') },
]

function FileCounts({ label, file }: { label: string; file: ImportFileSummary }) {
  return (
    <Stack gap={Gap.Tight}>
      <Text><Text as="span" strong>{label}:</Text> {file.validRows} of {file.totalRows} rows valid</Text>
      {file.invalidRows.length > 0 && (
        <Text variant={TextVariant.Small} tone={TextTone.Bad}>
          <BulletList items={file.invalidRows.map((row) => `Row ${row.rowNumber}: ${row.reason}`)} />
        </Text>
      )}
    </Stack>
  )
}

function DuplicateGroup({ group }: { group: DuplicateGroupSummary }) {
  return (
    <Card inset>
      <Stack>
        <Text strong>
          {group.key.title} @ {group.key.domain}: {group.sourcePostingIds.join(' + ')} merged into {group.canonicalId} <StatusBadge status={group.mergedStatus} />
        </Text>
        <BulletList
          items={[
            ...group.mergeRules,
            `Display posting: ${group.displayPostingId} · repost signal: ${group.repostCount}`,
            ...group.statusReasons.map((reason) => `${reason.postingId}: ${reason.reason} (${reason.status})`),
          ]}
        />
        <DataTable columns={CONFLICT_COLUMNS} rows={group.fieldConflicts} getRowKey={(conflict) => conflict.field} />
      </Stack>
    </Card>
  )
}

interface ImportOverviewProps {
  activeStatus: string
  onSelectStatus: (status: string) => void
  leadingTile?: ReactNode
}

function ImportBody({ summary, activeStatus, onSelectStatus, leadingTile }: ImportOverviewProps & { summary: ImportSummary }) {
  const { eligibilityCounts } = summary
  const invalidTotal = FILE_LABELS.reduce((total, { key }) => total + summary.files[key].invalidRows.length, 0)
  return (
    <Stack>
      <StatGrid>
        {leadingTile}
        <Stat label="Canonical opportunities" value={summary.canonicalOpportunities} hint="After dedup · all roles" tone={Tone.Info} selected={activeStatus === ''} onSelect={() => onSelectStatus('')} />
        {STATUS_TILES.map(({ status, label, tone }) => (
          <Stat
            key={status}
            label={label}
            value={eligibilityCounts[status]}
            hint={`${share(eligibilityCounts[status], summary.canonicalOpportunities)}% of roles`}
            sharePercent={share(eligibilityCounts[status], summary.canonicalOpportunities)}
            tone={tone}
            selected={activeStatus === status}
            onSelect={() => onSelectStatus(activeStatus === status ? '' : status)}
          />
        ))}
      </StatGrid>
      <Disclosure
        title="Import & dedup details"
        summary={`${invalidTotal} invalid rows · ${summary.duplicateGroups.length} merged groups`}
      >
        <Stack>
          {FILE_LABELS.map(({ key, label }) => <FileCounts key={key} label={label} file={summary.files[key]} />)}
          {summary.duplicateGroups.map((group) => <DuplicateGroup key={group.canonicalId} group={group} />)}
        </Stack>
      </Disclosure>
    </Stack>
  )
}

export function ImportOverview({ activeStatus, onSelectStatus, leadingTile }: ImportOverviewProps) {
  const state = useApi<ImportSummary>('/api/import-summary')
  return <ApiBoundary state={state}>{(summary) => <ImportBody summary={summary} activeStatus={activeStatus} onSelectStatus={onSelectStatus} leadingTile={leadingTile} />}</ApiBoundary>
}
