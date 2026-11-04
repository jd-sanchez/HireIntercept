import { useState } from 'react'
import type { SequenceReport } from '@hireintercept/core/sequences'
import { Button } from '../components/Button'
import { DataTable, type Column } from '../components/DataTable'
import { Drawer } from '../components/Drawer'
import { Gap, Stack } from '../components/Layout'
import { Text, TextTone, TextVariant } from '../components/Text'
import { PostingLinks } from './PostingLinks'
import { STOP_REASON_LABEL } from './SequenceTrack'

type SuppressionEntry = SequenceReport['suppressionList'][number]

const COLUMNS: Column<SuppressionEntry>[] = [
  { id: 'contact', header: 'Contact', sortValue: (entry) => entry.contactKey, render: (entry) => <Text strong>{entry.contactKey}</Text> },
  { id: 'postings', header: 'Postings', render: (entry) => <span className="suppression-nowrap"><PostingLinks postingIds={entry.postingIds} /></span> },
  { id: 'reason', header: 'Reason', sortValue: (entry) => entry.reason, render: (entry) => STOP_REASON_LABEL[entry.reason] },
  {
    id: 'day',
    header: 'Since',
    sortValue: (entry) => entry.day ?? -1,
    render: (entry) => <span className="suppression-nowrap">{entry.day === null ? 'Start' : `Day ${entry.day}`}</span>,
  },
]

export function SuppressionList({ entries }: { entries: SuppressionEntry[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Do-not-contact list · {entries.length}</Button>
      {open && (
        <Drawer label="Do-not-contact list" onClose={() => setOpen(false)}>
          <Stack>
            <Stack gap={Gap.Tight}>
              <Text as="h2" variant={TextVariant.Heading}>Do-not-contact list</Text>
              <Text tone={TextTone.Muted}>Contacts whose pending follow-ups were cancelled. Each block applies to every posting at that domain.</Text>
            </Stack>
            <DataTable columns={COLUMNS} rows={entries} getRowKey={(entry) => entry.contactKey} dense emptyMessage="No suppressed contacts." />
          </Stack>
        </Drawer>
      )}
    </>
  )
}
