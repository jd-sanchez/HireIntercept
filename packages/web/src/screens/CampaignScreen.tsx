import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CampaignScope, type CampaignMetrics, type CampaignReport } from '@hireintercept/core/campaign'
import { roundedShare } from '@hireintercept/core/math'
import { Variant } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { Badge, Tone } from '../components/Badge'
import { SegmentedControl } from '../components/Button'
import { Callout } from '../components/Callout'
import { Section } from '../components/Card'
import { DataTable, type Column } from '../components/DataTable'
import { Cluster, Gap, Spread, Stack } from '../components/Layout'
import { Stat, StatGrid } from '../components/Stat'
import { BulletList, Text, TextTone, TextVariant } from '../components/Text'

interface MetricRow {
  label: string
  read: (metrics: CampaignMetrics) => string | number
}

const SCOPE_LABELS: Record<CampaignScope, string> = {
  [CampaignScope.All]: 'All events',
  [CampaignScope.Eligible]: 'Eligible only',
}

const METRIC_ROWS: MetricRow[] = [
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
    <div style={{ height: '18rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages} layout="vertical" margin={{ left: 24, right: 32 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-line)" />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-muted)', fontSize: 12 }} />
          <YAxis type="category" dataKey="stage" width={130} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-soft)', fontSize: 13 }} />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList dataKey="count" position="right" fill="var(--color-ink)" fontSize={13} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CampaignBody({ report }: { report: CampaignReport }) {
  const { overall } = report.metrics
  const variants = [
    { label: 'Variant A (candidate-first)', metrics: report.metrics[Variant.A] },
    { label: 'Variant B (speed-first)', metrics: report.metrics[Variant.B] },
    { label: 'Overall', metrics: overall },
  ]
  const columns: Column<MetricRow>[] = [
    { id: 'metric', header: 'Metric', render: (row) => row.label },
    ...variants.map((variant) => ({ id: variant.label, header: variant.label, render: (row: MetricRow) => row.read(variant.metrics) })),
  ]
  return (
    <Stack gap={Gap.Loose}>
      <Callout>
        <Text>{report.sampleSize.message} ({report.sampleSize.contactsPerArm[Variant.A]} contacts in A, {report.sampleSize.contactsPerArm[Variant.B]} in B).</Text>
        {report.insight && <Text strong>{report.insight}</Text>}
      </Callout>

      <StatGrid>
        <Stat label="Messages sent" value={overall.messagesSent} tone={Tone.Info} />
        <Stat label="Delivered" value={overall.delivered} />
        <Stat label="Positive replies" value={overall.positiveReplies} tone={Tone.Good} />
        <Stat label="Meetings booked" value={overall.meetingsBooked} tone={Tone.Good} />
      </StatGrid>

      <Section title="Funnel (overall)"><Funnel metrics={overall} /></Section>

      <Section title="A/B comparison">
        <DataTable columns={columns} rows={METRIC_ROWS} getRowKey={(row) => row.label} minWidth="38rem" />
      </Section>

      <Section title="Data-integrity warnings">
        {report.warnings.length === 0 ? <Text>No warnings.</Text> : (
          <Stack>
            {report.warnings.map((warning) => (
              <Cluster key={warning.type} gap={Gap.Tight}>
                <Badge tone={Tone.Bad}>{warning.message}</Badge>
                <Text variant={TextVariant.Small} tone={TextTone.Soft}>{warning.postingIds.join(', ')}</Text>
              </Cluster>
            ))}
          </Stack>
        )}
      </Section>

      <Section title="Notes"><BulletList items={report.notes} /></Section>
    </Stack>
  )
}

export function CampaignScreen() {
  const [scope, setScope] = useState(CampaignScope.All)
  const state = useApi<CampaignReport>(`/api/campaign?scope=${scope}`)
  return (
    <Stack gap={Gap.Loose}>
      <Spread>
        <Stack gap={Gap.Tight}>
          <Text as="h1" variant={TextVariant.Title}>Campaign</Text>
          <Text tone={TextTone.Soft}>Variant A against B, from send to closed client.</Text>
        </Stack>
        <SegmentedControl
          label="Event scope"
          value={scope}
          options={Object.values(CampaignScope).map((entry) => ({ value: entry, label: SCOPE_LABELS[entry] }))}
          onChange={setScope}
        />
      </Spread>
      <ApiBoundary state={state}>{(report) => <CampaignBody report={report} />}</ApiBoundary>
    </Stack>
  )
}
