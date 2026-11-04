import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CampaignScope, type CampaignMetrics, type CampaignReport } from '@hireintercept/core/campaign'
import { roundedShare } from '@hireintercept/core/math'
import { Variant } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary, Badge, Section, Tone, tableCellClass, tableHeadClass } from '../components/ui'

const SCOPE_LABELS: Record<CampaignScope, string> = {
  [CampaignScope.All]: 'All events',
  [CampaignScope.Eligible]: 'Eligible only',
}

const METRIC_ROWS: { label: string; read: (metrics: CampaignMetrics) => string | number }[] = [
  { label: 'Messages sent', read: (metrics) => metrics.messagesSent },
  { label: 'Unique contacts', read: (metrics) => metrics.uniqueContacts },
  { label: 'Delivered', read: (metrics) => metrics.delivered },
  { label: 'Unique opens', read: (metrics) => metrics.uniqueOpens },
  { label: 'Raw opens', read: (metrics) => metrics.rawOpens },
  {
    label: 'Open rate (unique opens / delivered)',
    read: (metrics) => (metrics.delivered === 0 ? '—' : `≈ ${roundedShare(metrics.uniqueOpens, metrics.delivered, 100)}% (approximate)`),
  },
  { label: 'Bounces', read: (metrics) => metrics.bounces },
  { label: 'Positive replies', read: (metrics) => metrics.positiveReplies },
  { label: 'Negative replies', read: (metrics) => metrics.negativeReplies },
  { label: 'Unsubscribes', read: (metrics) => metrics.unsubscribes },
  { label: 'Meetings booked', read: (metrics) => metrics.meetingsBooked },
  { label: 'Clients won', read: (metrics) => metrics.clientsWon },
]

function Funnel({ metrics }: { metrics: CampaignMetrics }) {
  const stages = [
    { stage: 'Sent', count: metrics.messagesSent },
    { stage: 'Delivered', count: metrics.delivered },
    { stage: 'Unique opens (≈)', count: metrics.uniqueOpens },
    { stage: 'Positive replies', count: metrics.positiveReplies },
    { stage: 'Meetings booked', count: metrics.meetingsBooked },
    { stage: 'Clients won', count: metrics.clientsWon },
  ]
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages} layout="vertical" margin={{ left: 24, right: 32 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="stage" width={130} />
          <Bar dataKey="count" fill="var(--color-sky-600)">
            <LabelList dataKey="count" position="right" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CampaignBody({ report }: { report: CampaignReport }) {
  const columns: { label: string; metrics: CampaignMetrics }[] = [
    { label: 'Variant A (candidate-first)', metrics: report.metrics[Variant.A] },
    { label: 'Variant B (speed-first)', metrics: report.metrics[Variant.B] },
    { label: 'Overall', metrics: report.metrics.overall },
  ]
  return (
    <div className="space-y-4">
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        {report.sampleSize.message} ({report.sampleSize.contactsPerArm[Variant.A]} contacts in A, {report.sampleSize.contactsPerArm[Variant.B]} in B).
      </div>
      {report.insight && <p className="rounded bg-rose-50 p-3 text-sm font-medium text-rose-900">{report.insight}</p>}

      <Section title="Funnel (overall)"><Funnel metrics={report.metrics.overall} /></Section>

      <Section title="A/B comparison">
        <table className="w-full">
          <thead>
            <tr>
              <th className={tableHeadClass}>Metric</th>
              {columns.map((column) => <th key={column.label} className={tableHeadClass}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => (
              <tr key={row.label}>
                <td className={tableCellClass}>{row.label}</td>
                {columns.map((column) => <td key={column.label} className={tableCellClass}>{row.read(column.metrics)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Data-integrity warnings">
        {report.warnings.length === 0 ? <p className="text-sm">No warnings.</p> : (
          <ul className="space-y-2 text-sm">
            {report.warnings.map((warning) => (
              <li key={warning.type}>
                <Badge tone={Tone.Bad}>{warning.message}</Badge>{' '}
                <span className="text-slate-700">{warning.postingIds.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Notes">
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {report.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </Section>
    </div>
  )
}

export function CampaignScreen() {
  const [scope, setScope] = useState(CampaignScope.All)
  const state = useApi<CampaignReport>(`/api/campaign?scope=${scope}`)
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {Object.values(CampaignScope).map((entry) => (
          <button
            key={entry}
            onClick={() => setScope(entry)}
            className={`rounded px-3 py-1.5 text-sm ${entry === scope ? 'bg-sky-700 text-white' : 'bg-white ring-1 ring-slate-300'}`}
          >
            {SCOPE_LABELS[entry]}
          </button>
        ))}
      </div>
      <ApiBoundary state={state}>{(report) => <CampaignBody report={report} />}</ApiBoundary>
    </div>
  )
}
