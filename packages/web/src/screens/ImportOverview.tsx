import { EligibilityStatus, type DuplicateGroupSummary, type ImportFileSummary, type ImportSummary } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
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

function ImportBody({ summary }: { summary: ImportSummary }) {
  const { eligibilityCounts } = summary
  const invalidTotal = FILE_LABELS.reduce((total, { key }) => total + summary.files[key].invalidRows.length, 0)
  return (
    <Stack>
      <StatGrid>
        <Stat label="Canonical opportunities" value={summary.canonicalOpportunities} hint="after dedup" tone={Tone.Info} />
        <Stat label="Eligible" value={eligibilityCounts[EligibilityStatus.Eligible]} tone={Tone.Good} />
        <Stat label="Needs verification" value={eligibilityCounts[EligibilityStatus.NeedsVerification]} tone={Tone.Warn} />
        <Stat label="Ineligible" value={eligibilityCounts[EligibilityStatus.Ineligible]} tone={Tone.Bad} />
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

export function ImportOverview() {
  const state = useApi<ImportSummary>('/api/import-summary')
  return <ApiBoundary state={state}>{(summary) => <ImportBody summary={summary} />}</ApiBoundary>
}
