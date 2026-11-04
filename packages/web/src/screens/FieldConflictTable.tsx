import { RemotePolicy, type FieldConflict } from '@hireintercept/core/types'
import { DataTable, type Column } from '../components/DataTable'

const REMOTE_POLICY_LABEL: Record<RemotePolicy, string> = {
  [RemotePolicy.Global]: 'Global',
  [RemotePolicy.UsOnly]: 'U.S.-only',
  [RemotePolicy.Onsite]: 'On-site',
  [RemotePolicy.RemoteUnspecified]: 'Remote, not specified',
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const humanizeField = (field: string) =>
  capitalize(field.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/\b(usd|us)\b/g, (acronym) => acronym.toUpperCase()))

const formatValue = (value: string) => {
  const policy = Object.values(RemotePolicy).find((entry) => entry === value)
  return policy ? REMOTE_POLICY_LABEL[policy] : capitalize(value)
}

interface FieldConflictTableProps {
  postingIds: string[]
  shownPostingId: string
  conflicts: FieldConflict[]
}

export function FieldConflictTable({ postingIds, shownPostingId, conflicts }: FieldConflictTableProps) {
  const columns: Column<FieldConflict>[] = [
    { id: 'field', header: 'Field', render: (conflict) => humanizeField(conflict.field) },
    ...postingIds.map((postingId) => ({
      id: postingId,
      header: postingId === shownPostingId ? `${postingId} · shown` : postingId,
      render: (conflict: FieldConflict) => {
        const entry = conflict.values.find((candidate) => candidate.postingId === postingId)
        return entry ? formatValue(entry.value) : '—'
      },
    })),
  ]
  return <DataTable columns={columns} rows={conflicts} getRowKey={(conflict) => conflict.field} dense />
}
