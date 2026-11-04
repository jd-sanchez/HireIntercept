import type { ImportFileSummary, ImportSummary } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary, Badge, StatusBadge, Tone, tableCellClass, tableHeadClass } from '../components/ui'

const FILE_LABELS: { key: keyof ImportSummary['files']; label: string }[] = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'events', label: 'Events' },
]

function FileCounts({ label, file }: { label: string; file: ImportFileSummary }) {
  return (
    <li>
      <strong>{label}:</strong> {file.validRows} of {file.totalRows} rows valid
      {file.invalidRows.length > 0 && (
        <ul className="ml-4 list-disc text-bad-ink">
          {file.invalidRows.map((row) => (
            <li key={row.rowNumber}>Row {row.rowNumber}: {row.reason}</li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function ImportSection() {
  const state = useApi<ImportSummary>('/api/import-summary')
  return (
    <details className="mb-4 rounded-card border border-line bg-surface shadow-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">Import &amp; dedup</summary>
      <ApiBoundary state={state}>
        {(summary) => (
          <div className="mt-3 space-y-4 text-sm">
            <ul className="space-y-1">
              {FILE_LABELS.map(({ key, label }) => (
                <FileCounts key={key} label={label} file={summary.files[key]} />
              ))}
            </ul>
            <p>
              {summary.canonicalOpportunities} canonical opportunities after dedup ·{' '}
              {Object.entries(summary.eligibilityCounts).map(([status, count]) => `${count} ${status.replace('_', ' ')}`).join(' · ')}
            </p>
            {summary.duplicateGroups.map((group) => (
              <div key={group.canonicalId} className="rounded border border-line p-3">
                <p className="font-medium">
                  {group.key.title} @ {group.key.domain}: {group.sourcePostingIds.join(' + ')} merged into {group.canonicalId}{' '}
                  <StatusBadge status={group.mergedStatus} />
                </p>
                <ul className="mt-1 list-disc pl-5 text-ink-soft">
                  {group.mergeRules.map((rule) => <li key={rule}>{rule}</li>)}
                  <li>Display posting: {group.displayPostingId} · repost signal: {group.repostCount}</li>
                  {group.statusReasons.map((reason) => <li key={reason.postingId}>{reason.postingId}: {reason.reason} ({reason.status})</li>)}
                </ul>
                <table className="mt-2 w-full">
                  <thead>
                    <tr><th className={tableHeadClass}>Conflicting field</th><th className={tableHeadClass}>Values by posting</th></tr>
                  </thead>
                  <tbody>
                    {group.fieldConflicts.map((conflict) => (
                      <tr key={conflict.field}>
                        <td className={tableCellClass}><Badge tone={Tone.Warn}>{conflict.field}</Badge></td>
                        <td className={tableCellClass}>{conflict.values.map((entry) => `${entry.postingId}: ${entry.value}`).join('  |  ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </ApiBoundary>
    </details>
  )
}
