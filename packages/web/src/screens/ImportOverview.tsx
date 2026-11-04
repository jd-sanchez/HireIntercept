import { useState } from 'react'
import { type DuplicateGroupSummary, type ImportFileSummary, type ImportSummary } from '@hireintercept/core/types'
import { StatusBadge } from '../components/Badge'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Drawer } from '../components/Drawer'
import { FieldConflictTable } from './FieldConflictTable'
import { Cluster, Gap, Spread, Stack } from '../components/Layout'
import { BulletList, Text, TextTone, TextVariant } from '../components/Text'

const FILE_LABELS: { key: keyof ImportSummary['files']; label: string }[] = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'events', label: 'Events' },
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
        <Spread>
          <Stack gap={Gap.Tight}>
            <Text strong>{group.key.title}</Text>
            <Text variant={TextVariant.Small} tone={TextTone.Muted}>
              {group.key.domain} · {group.sourcePostingIds.join(' + ')} merged into {group.canonicalId} · repost signal {group.repostCount}
            </Text>
          </Stack>
          <StatusBadge status={group.mergedStatus} />
        </Spread>
        <Stack gap={Gap.Tight}>
          {group.statusReasons.map((reason) => (
            <Cluster key={reason.postingId} gap={Gap.Tight}>
              <Text as="span" variant={TextVariant.Small} strong>{reason.postingId}</Text>
              <Text as="span" variant={TextVariant.Small} tone={TextTone.Soft}>{[reason.reason, ...reason.alsoReasons.map((also) => `also: ${also}`)].join(' · ')}</Text>
              <StatusBadge status={reason.status} />
            </Cluster>
          ))}
        </Stack>
        <FieldConflictTable postingIds={group.sourcePostingIds} shownPostingId={group.displayPostingId} conflicts={group.fieldConflicts} />
      </Stack>
    </Card>
  )
}

export function ImportDetails({ summary }: { summary: ImportSummary }) {
  const [open, setOpen] = useState(false)
  const mergeRules = summary.duplicateGroups[0]?.mergeRules ?? []
  return (
    <>
      <Button onClick={() => setOpen(true)}>Import details</Button>
      {open && (
        <Drawer label="Import details" onClose={() => setOpen(false)}>
          <Stack>
            <Stack gap={Gap.Tight}>
              <Text as="h2" variant={TextVariant.Heading}>Import details</Text>
              <Text tone={TextTone.Muted}>{summary.files.jobs.validRows} postings became {summary.canonicalOpportunities} jobs after merging duplicates.</Text>
            </Stack>
            {FILE_LABELS.map(({ key, label }) => <FileCounts key={key} label={label} file={summary.files[key]} />)}
            {mergeRules.length > 0 && (
              <Stack gap={Gap.Tight}>
                <Text strong>How duplicate postings are merged</Text>
                <Text variant={TextVariant.Small} tone={TextTone.Soft}><BulletList items={mergeRules} /></Text>
              </Stack>
            )}
            {summary.duplicateGroups.map((group) => <DuplicateGroup key={group.canonicalId} group={group} />)}
          </Stack>
        </Drawer>
      )}
    </>
  )
}
