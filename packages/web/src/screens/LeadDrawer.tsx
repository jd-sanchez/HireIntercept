import {
  DraftStatus,
  type CandidateMatch,
  type EmailDraft,
  type Opportunity,
  type ScoreComponent,
} from '@hireintercept/core/types'
import { roundedShare } from '@hireintercept/core/math'
import { useApi } from '../api'
import { ApiBoundary } from '../components/ApiBoundary'
import { Badge, DRAFT_STATUS_LABEL, StatusBadge, SyntheticBadge, Tone, statusLabel } from '../components/Badge'
import { Card, Section } from '../components/Card'
import { Drawer } from '../components/Drawer'
import { FieldConflictTable } from './FieldConflictTable'
import './ScoreBreakdown.css'
import { Cluster, Gap, Stack } from '../components/Layout'
import { ScoreBar, ScoreRing } from '../components/Score'
import { BulletList, Text, TextTone, TextVariant } from '../components/Text'

const COMPONENT_LABELS: Record<string, string> = {
  remoteEligibility: 'Remote eligibility',
  candidateFit: 'Candidate fit',
  demandSignals: 'Demand signals',
  commercialValue: 'Commercial value & data confidence',
}

const percentOf = (component: ScoreComponent) => (component.max === 0 ? 0 : roundedShare(component.points, component.max, 100))

function ScoreBreakdown({ opportunity }: { opportunity: Opportunity }) {
  if (!opportunity.score) return <Text tone={TextTone.Soft} italic>{opportunity.notScoredReason}</Text>
  const entries: [string, ScoreComponent][] = Object.entries(opportunity.score.components)
  return (
    <Stack gap={Gap.Loose}>
      <Cluster gap={Gap.Loose}>
        <ScoreRing value={opportunity.score.total} label={`Score ${opportunity.score.total} out of 100`} />
        <Stack gap={Gap.Tight}>
          <Text variant={TextVariant.Heading}>Priority score</Text>
          <Text variant={TextVariant.Small} tone={TextTone.Muted}>out of 100</Text>
          {opportunity.score.provisional && <Badge tone={Tone.Warn}>Provisional: needs verification</Badge>}
        </Stack>
      </Cluster>
      {entries.map(([key, component]) => (
        <Stack key={key} gap={Gap.Tight}>
          <Cluster>
            <Text strong>{COMPONENT_LABELS[key] ?? key}</Text>
            <Text as="span"><Text as="span" strong>{component.points}</Text> <Text as="span" tone={TextTone.Muted}>/ {component.max}</Text></Text>
          </Cluster>
          <ScoreBar percent={percentOf(component)} />
          <ul className="score-lines">
            {component.lines.map((line) => (
              <li key={line.text} className="score-line" data-zero={line.points === 0}>
                <span>{line.text}</span>
                <span className="score-line__points">+{line.points}</span>
              </li>
            ))}
          </ul>
          {component.note && <Text variant={TextVariant.Small} tone={TextTone.Muted}>{component.note}</Text>}
        </Stack>
      ))}
    </Stack>
  )
}

function MatchCard({ match }: { match: CandidateMatch }) {
  return (
    <Card inset>
      <Stack gap={Gap.Tight}>
        <Cluster gap={Gap.Tight}>
          <Text strong>{match.candidateId} · {match.roleSpecialty}</Text>
          <Badge tone={match.verified ? Tone.Good : Tone.Warn}>{match.verified ? 'Verified match' : 'Not verified'}</Badge>
          <SyntheticBadge />
        </Cluster>
        <Text>Coverage {match.coveragePercent}% ({match.matchedSkills.length}/{match.requiredSkillCount} skills)</Text>
        <Text tone={TextTone.Good}>Evidence: {match.matchedSkills.join(', ') || 'none'}</Text>
        <Text tone={TextTone.Soft}>Availability: {match.availableNow ? 'available now' : 'not available now'} · U.S. hours: {match.usHoursAvailable ? 'yes' : 'no'}</Text>
        {match.gaps.length > 0 && <Text tone={TextTone.Bad}>Gaps: {match.gaps.join('; ')}</Text>}
        {match.notes.length > 0 && <Text tone={TextTone.Warn}>{match.notes.join('; ')}</Text>}
      </Stack>
    </Card>
  )
}

function DraftCard({ title, draft, missingReason }: { title: string; draft: EmailDraft | null; missingReason?: string }) {
  return (
    <Card inset>
      <Stack>
        <Cluster gap={Gap.Tight}>
          <Text strong>{title}</Text>
          {draft && <Badge tone={draft.status === DraftStatus.HeldPendingVerification ? Tone.Warn : Tone.Neutral}>{DRAFT_STATUS_LABEL[draft.status]}</Badge>}
        </Cluster>
        {draft ? (
          <>
            <Text strong>Subject: {draft.subject}</Text>
            <Text as="pre" tone={TextTone.Soft}>{draft.body}</Text>
          </>
        ) : (
          <Text tone={TextTone.Soft} italic>{missingReason}</Text>
        )}
      </Stack>
    </Card>
  )
}

function DrawerBody({ opportunity }: { opportunity: Opportunity }) {
  const { drafts, eligibility, display } = opportunity
  return (
    <Stack gap={Gap.Loose}>
      <Stack gap={Gap.Tight}>
        <Text as="h2" variant={TextVariant.Title}>{display.company}</Text>
        <Text tone={TextTone.Soft}>{display.title}</Text>
        <Cluster gap={Gap.Tight}>
          <Text variant={TextVariant.Small} tone={TextTone.Muted}>{display.industry} · {display.domain}</Text>
          <StatusBadge status={eligibility.status} />
          {opportunity.proposedToLeads > 1 && (
            <Badge tone={Tone.Warn}>Proposed to {opportunity.proposedToLeads} jobs: {opportunity.bestMatch?.candidateId}</Badge>
          )}
        </Cluster>
      </Stack>

      <Section title="Score breakdown"><ScoreBreakdown opportunity={opportunity} /></Section>

      <Section title="Eligibility">
        <Stack>
          <BulletList items={eligibility.reasons.map((reason) => `${reason.postingId}: ${reason.reason} (${statusLabel(reason.status)})${reason.alsoReasons.length > 0 ? ` · Also: ${reason.alsoReasons.join(', ')}` : ''}`)} />
          {eligibility.confirmWorkingHours && <Text tone={TextTone.Warn}>Confirm working hours (U.S. hours requirement unknown)</Text>}
        </Stack>
      </Section>

      <Section title="Candidate matches">
        {opportunity.matches ? (
          <Stack>
            {opportunity.matches.map((match) => <MatchCard key={match.candidateId} match={match} />)}
            {opportunity.matches.length === 0 && <Text italic tone={TextTone.Soft}>No candidate in pool for this role</Text>}
          </Stack>
        ) : (
          <Text tone={TextTone.Soft} italic>{opportunity.matchNote}</Text>
        )}
      </Section>

      <Section title="Outreach drafts (never sent)">
        {drafts ? (
          <Stack>
            <DraftCard title="Variant A · candidate-first" draft={drafts.A} missingReason="Not generated: no verified candidate" />
            <DraftCard title="Variant B · hiring-process / speed-first" draft={drafts.B} />
          </Stack>
        ) : (
          <Text tone={TextTone.Soft} italic>No drafts: ineligible job</Text>
        )}
      </Section>

      <Section title="Linked duplicate postings">
        {opportunity.hasLinkedDuplicate ? (
          <Stack>
            <Text>Merged postings: {opportunity.sourcePostingIds.join(', ')} (display from {display.postingId})</Text>
            <FieldConflictTable postingIds={opportunity.sourcePostingIds} shownPostingId={display.postingId} conflicts={opportunity.fieldConflicts} />
          </Stack>
        ) : (
          <Text tone={TextTone.Soft}>No linked duplicates. Repeat postings are a signal of possible ongoing need, not proof of hiring difficulty.</Text>
        )}
      </Section>
    </Stack>
  )
}

export function LeadDrawer({ opportunityId, onClose }: { opportunityId: string; onClose: () => void }) {
  const state = useApi<Opportunity>(`/api/opportunities/${opportunityId}`)
  return (
    <Drawer label="Job detail" onClose={onClose}>
      <ApiBoundary state={state}>{(opportunity) => <DrawerBody opportunity={opportunity} />}</ApiBoundary>
    </Drawer>
  )
}
