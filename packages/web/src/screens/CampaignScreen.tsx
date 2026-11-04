import { useState } from 'react'
import { CampaignScope, WarningType, type CampaignMetrics, type CampaignReport, type CampaignWarning } from '@hireintercept/core/campaign'
import { roundedShare, sum } from '@hireintercept/core/math'
import { Variant } from '@hireintercept/core/types'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { Tone } from '../components/Badge'
import { SegmentedControl } from '../components/Button'
import { Callout } from '../components/Callout'
import { Section } from '../components/Card'
import { analyzeDualFunnel, DualFunnel, type DualFunnelStage } from '../components/DualFunnel'
import { ColumnAlign, DataTable, type Column } from '../components/DataTable'
import { Cluster, Gap, Spread, Stack } from '../components/Layout'
import { DifferenceChip } from '../components/DifferenceChip'
import { StickyBar } from '../components/StickyBar'
import { SignalChip } from '../components/SignalChip'
import { Stat, StatGrid } from '../components/Stat'
import { DataContext } from './DataContext'
import { PostingLinks } from './PostingLinks'
import './CampaignScreen.css'
import { BulletList, Text, TextTone, TextVariant } from '../components/Text'

interface MetricRow {
  group: string
  label: string
  read: (metrics: CampaignMetrics) => string | number
}

const VARIANT_A_LABEL = 'A · candidate-first'
const VARIANT_B_LABEL = 'B · speed-first'

const SCOPE_LABELS: Record<CampaignScope, string> = {
  [CampaignScope.All]: 'All events',
  [CampaignScope.Eligible]: 'Eligible only',
}

const rate = (count: number, total: number) => (total === 0 ? 0 : roundedShare(count, total, 100))

const NEGATIVE_SIGNALS: { label: string; read: (metrics: CampaignMetrics) => number }[] = [
  { label: 'Negative replies', read: (metrics) => metrics.negativeReplies },
  { label: 'Bounces', read: (metrics) => metrics.bounces },
  { label: 'Unsubscribes', read: (metrics) => metrics.unsubscribes },
]

const openRate = (metrics: CampaignMetrics) => (metrics.delivered === 0 ? '—' : `≈ ${roundedShare(metrics.uniqueOpens, metrics.delivered, 100)}%`)

const METRIC_ROWS: MetricRow[] = [
  { group: 'Reach', label: 'Messages sent', read: (metrics) => metrics.messagesSent },
  { group: 'Reach', label: 'Unique contacts', read: (metrics) => metrics.uniqueContacts },
  { group: 'Reach', label: 'Delivered', read: (metrics) => metrics.delivered },
  { group: 'Engagement', label: 'Unique opens', read: (metrics) => metrics.uniqueOpens },
  { group: 'Engagement', label: 'Raw opens', read: (metrics) => metrics.rawOpens },
  { group: 'Engagement', label: 'Open rate ≈', read: openRate },
  { group: 'Outcomes', label: 'Positive replies', read: (metrics) => metrics.positiveReplies },
  { group: 'Outcomes', label: 'Meetings booked', read: (metrics) => metrics.meetingsBooked },
  { group: 'Outcomes', label: 'Clients won', read: (metrics) => metrics.clientsWon },
  { group: 'Negative signals', label: 'Negative replies', read: (metrics) => metrics.negativeReplies },
  { group: 'Negative signals', label: 'Bounces', read: (metrics) => metrics.bounces },
  { group: 'Negative signals', label: 'Unsubscribes', read: (metrics) => metrics.unsubscribes },
]

const BROKEN_RULE_WARNINGS = new Set([WarningType.SendToIneligible, WarningType.FollowUpToIneligible])

const WARNING_COLUMNS: Column<CampaignWarning>[] = [
  {
    id: 'issue',
    header: 'Issue',
    render: (warning) => <Text as="span" tone={BROKEN_RULE_WARNINGS.has(warning.type) ? TextTone.Bad : TextTone.Default}>{warning.message}</Text>,
  },
  { id: 'count', header: 'Jobs', width: '5rem', align: ColumnAlign.End, render: (warning) => <Text as="span" strong>{warning.postingIds.length}</Text> },
  { id: 'jobs', header: 'Affected jobs', render: (warning) => <Text as="span" variant={TextVariant.Small} tone={TextTone.Soft}><PostingLinks postingIds={warning.postingIds} /></Text> },
]

const isEven = (row: MetricRow, first: CampaignMetrics, second: CampaignMetrics) => row.read(first) === row.read(second)

function DifferenceCell({ row, first, second }: { row: MetricRow; first: CampaignMetrics; second: CampaignMetrics }) {
  const firstValue = row.read(first)
  const secondValue = row.read(second)
  const muted = (label: string) => <Text as="span" variant={TextVariant.Small} tone={TextTone.Muted}>{label}</Text>
  if (typeof firstValue !== 'number' || typeof secondValue !== 'number') return firstValue === secondValue ? muted('Even') : null
  const difference = sum([secondValue, -firstValue])
  if (difference === 0) return muted('Even')
  return <DifferenceChip side={difference > 0 ? 'second' : 'first'} amount={Math.abs(difference)} />
}

function CampaignBody({ report, scope, onScopeChange }: { report: CampaignReport; scope: CampaignScope; onScopeChange: (scope: CampaignScope) => void }) {
  const { overall } = report.metrics
  const metricsA = report.metrics[Variant.A]
  const metricsB = report.metrics[Variant.B]
  const valueCell = (row: MetricRow, metrics: CampaignMetrics) => (
    <Text as="span" tone={isEven(row, metricsA, metricsB) ? TextTone.Muted : TextTone.Default} strong={!isEven(row, metricsA, metricsB)}>{row.read(metrics)}</Text>
  )
  const columns: Column<MetricRow>[] = [
    { id: 'metric', header: 'Metric', render: (row) => row.label },
    { id: 'a', header: VARIANT_A_LABEL, align: ColumnAlign.End, render: (row) => valueCell(row, metricsA) },
    { id: 'b', header: VARIANT_B_LABEL, align: ColumnAlign.End, render: (row) => valueCell(row, metricsB) },
    { id: 'overall', header: 'Overall', align: ColumnAlign.End, render: (row) => row.read(overall) },
    { id: 'difference', header: 'Difference', align: ColumnAlign.End, render: (row) => <DifferenceCell row={row} first={metricsA} second={metricsB} /> },
  ]
  const funnelStages: DualFunnelStage[] = [
    { label: 'Sent', read: (metrics: CampaignMetrics) => metrics.messagesSent },
    { label: 'Delivered', read: (metrics: CampaignMetrics) => metrics.delivered },
    { label: 'Unique opens (≈)', read: (metrics: CampaignMetrics) => metrics.uniqueOpens },
    { label: 'Positive replies', read: (metrics: CampaignMetrics) => metrics.positiveReplies },
    { label: 'Meetings booked', read: (metrics: CampaignMetrics) => metrics.meetingsBooked },
    { label: 'Clients won', read: (metrics: CampaignMetrics) => metrics.clientsWon },
  ].map(({ label, read }) => ({ label, first: read(metricsA), second: read(metricsB) }))
  const { widest } = analyzeDualFunnel(funnelStages)
  const funnelAside = widest
    ? `Biggest gap: ${widest.label} (A ${widest.firstConversion}% vs B ${widest.secondConversion}%)`
    : 'A and B convert alike at every stage'
  const warningsByCount = [...report.warnings].sort((left, right) => right.postingIds.length - left.postingIds.length)
  const affectedJobCount = new Set(report.warnings.flatMap((warning) => warning.postingIds)).size
  const splitOf = (read: (metrics: CampaignMetrics) => number) => ({ first: read(metricsA), second: read(metricsB) })
  return (
    <Stack gap={Gap.Loose}>
      <Callout>
        <Text variant={TextVariant.Heading}>{report.insight ?? report.sampleSize.message}</Text>
        <Text variant={TextVariant.Small}>{report.sampleSize.message} ({report.sampleSize.contactsPerArm[Variant.A]} contacts in A, {report.sampleSize.contactsPerArm[Variant.B]} in B).</Text>
      </Callout>

      <div className="variant-legend">
        <span><i data-side="first" aria-hidden="true" />{VARIANT_A_LABEL} email</span>
        <span><i data-side="second" aria-hidden="true" />{VARIANT_B_LABEL} email</span>
        <span className="variant-legend__hint">The small A and B figures on each tile split its total by variant</span>
      </div>

      <StatGrid>
        <Stat label="Messages sent" value={overall.messagesSent} hint="Both variants combined" split={splitOf((metrics) => metrics.messagesSent)} tone={Tone.Info} />
        <Stat label="Delivered" value={overall.delivered} hint={`${rate(overall.delivered, overall.messagesSent)}% delivery rate`} split={splitOf((metrics) => metrics.delivered)} sharePercent={rate(overall.delivered, overall.messagesSent)} tone={Tone.Info} />
        <Stat label="Positive replies" value={overall.positiveReplies} hint={`${rate(overall.positiveReplies, overall.delivered)}% of delivered`} split={splitOf((metrics) => metrics.positiveReplies)} sharePercent={rate(overall.positiveReplies, overall.delivered)} tone={Tone.Good} />
        <Stat label="Meetings booked" value={overall.meetingsBooked} hint={`${rate(overall.meetingsBooked, overall.positiveReplies)}% of positive replies`} split={splitOf((metrics) => metrics.meetingsBooked)} sharePercent={rate(overall.meetingsBooked, overall.positiveReplies)} tone={Tone.Good} />
      </StatGrid>

      <StickyBar label="Event scope">
        <Text variant={TextVariant.Small} tone={TextTone.Muted} strong>Showing</Text>
        <SegmentedControl
          label="Event scope"
          value={scope}
          options={Object.values(CampaignScope).map((entry) => ({ value: entry, label: SCOPE_LABELS[entry] }))}
          onChange={onScopeChange}
        />
        <Text variant={TextVariant.Small} tone={TextTone.Soft}>{SCOPE_NOTES[scope]}</Text>
        <span className="ui-sticky-bar__grow">
          <Text as="span" variant={TextVariant.Small} tone={TextTone.Muted} strong>{overall.messagesSent} messages in scope</Text>
        </span>
      </StickyBar>

      <Section
        title="Outreach funnel by variant"
        description={`How many contacts reach each stage, and the share kept from the previous stage. ${report.sampleSize.message}.`}
        aside={funnelAside}
      >
        <Stack>
          <DualFunnel firstLabel={VARIANT_A_LABEL} secondLabel={VARIANT_B_LABEL} stages={funnelStages} />
          <Cluster gap={Gap.Tight}>
            <Text variant={TextVariant.Small} tone={TextTone.Muted} strong>Negative signals</Text>
            <Text variant={TextVariant.Small} tone={TextTone.Muted}>events per variant · blue is A, grey is B</Text>
            {NEGATIVE_SIGNALS.map((signal) => (
              <SignalChip key={signal.label} label={signal.label} first={signal.read(metricsA)} second={signal.read(metricsB)} />
            ))}
          </Cluster>
        </Stack>
      </Section>

      <Section title="Every metric, side by side" description="Exact counts for A, B and overall, grouped by stage. Identical rows fade so the differences stand out.">
        <Stack>
          <DataTable columns={columns} rows={METRIC_ROWS} getRowKey={(row) => row.label} groupBy={(row) => row.group} dense minWidth="34rem" />
          <Text variant={TextVariant.Small} tone={TextTone.Muted}>≈ Open rate is approximate: unique opens ÷ delivered. Opens are never inferred from replies. Bold values differ between A and B.</Text>
        </Stack>
      </Section>

      <Section
        title="Data quality"
        description="Problems in the sample data that could skew the numbers above."
        aside={report.warnings.length === 0 ? 'Nothing to flag' : `${affectedJobCount} jobs affected · ${report.warnings.length} issues`}
      >
        <Stack>
          {report.warnings.length === 0 ? (
            <Text>Nothing to flag.</Text>
          ) : (
            <DataTable columns={WARNING_COLUMNS} rows={warningsByCount} getRowKey={(warning) => warning.type} dense minWidth="30rem" />
          )}
          <Stack gap={Gap.Tight}>
            <Text variant={TextVariant.Small} tone={TextTone.Muted} strong>How to read these numbers</Text>
            <Text variant={TextVariant.Small} tone={TextTone.Muted}><BulletList items={report.notes} /></Text>
          </Stack>
        </Stack>
      </Section>
    </Stack>
  )
}

const SCOPE_NOTES: Record<CampaignScope, string> = {
  [CampaignScope.All]: 'Counts every recorded event, including jobs we cannot serve.',
  [CampaignScope.Eligible]: 'Counts only events on jobs eligible for overseas placement.',
}

export function CampaignScreen() {
  const [scope, setScope] = useState(CampaignScope.All)
  const state = useApi<CampaignReport>(`/api/campaign?scope=${scope}`)
  return (
    <Stack gap={Gap.Loose}>
      <Stack gap={Gap.Tight}>
        <Text as="h1" variant={TextVariant.Title}>Campaign</Text>
        <Text tone={TextTone.Soft}>Variant A against B, from send to closed client.</Text>
        <DataContext />
      </Stack>
      <ApiBoundary state={state}>{(report) => <CampaignBody report={report} scope={scope} onScopeChange={setScope} />}</ApiBoundary>
    </Stack>
  )
}
