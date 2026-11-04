import { useEffect } from 'react'
import {
  DraftStatus,
  EligibilityStatus,
  type CandidateMatch,
  type EmailDraft,
  type Opportunity,
  type ScoreComponent,
} from '@hireintercept/core/types'
import { useApi } from '../api'
import {
  ApiBoundary,
  Badge,
  DRAFT_STATUS_LABEL,
  Section,
  StatusBadge,
  SyntheticBadge,
  Tone,
  tableCellClass,
  tableHeadClass,
} from '../components/ui'

const COMPONENT_LABELS: Record<string, string> = {
  remoteEligibility: 'Remote eligibility',
  candidateFit: 'Candidate fit',
  demandSignals: 'Demand signals',
  commercialValue: 'Commercial value & data confidence',
}

function ScoreBreakdown({ opportunity }: { opportunity: Opportunity }) {
  if (!opportunity.score) return <p className="text-sm italic text-slate-600">{opportunity.notScoredReason}</p>
  const entries: [string, ScoreComponent][] = Object.entries(opportunity.score.components)
  return (
    <div className="space-y-3 text-sm">
      <p className="text-lg font-semibold">
        {opportunity.score.total} / 100 {opportunity.score.provisional && <Badge tone={Tone.Warn}>provisional</Badge>}
      </p>
      {entries.map(([key, component]) => (
        <div key={key}>
          <p className="font-medium">{COMPONENT_LABELS[key] ?? key}: {component.points} / {component.max}</p>
          <ul className="list-disc pl-5 text-slate-600">
            {component.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}

function MatchCard({ match }: { match: CandidateMatch }) {
  return (
    <div className="rounded border border-slate-200 p-3 text-sm">
      <p className="mb-1 flex flex-wrap items-center gap-2 font-medium">
        {match.candidateId} · {match.roleSpecialty}
        <Badge tone={match.verified ? Tone.Good : Tone.Warn}>{match.verified ? 'Verified match' : 'Not verified'}</Badge>
        <SyntheticBadge />
      </p>
      <p>Coverage {match.coveragePercent}% ({match.matchedSkills.length}/{match.requiredSkillCount} skills)</p>
      <p className="text-emerald-800">Evidence: {match.matchedSkills.join(', ') || 'none'}</p>
      <p>Availability: {match.availableNow ? 'available now' : 'not available now'} · U.S. hours: {match.usHoursAvailable ? 'yes' : 'no'}</p>
      {match.gaps.length > 0 && <p className="text-rose-700">Gaps: {match.gaps.join('; ')}</p>}
      {match.notes.length > 0 && <p className="text-amber-800">{match.notes.join('; ')}</p>}
    </div>
  )
}

function DraftCard({ title, draft, missingReason }: { title: string; draft: EmailDraft | null; missingReason?: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 text-sm">
      <p className="mb-2 flex flex-wrap items-center gap-2 font-medium">
        {title}
        {draft && (
          <Badge tone={draft.status === DraftStatus.HeldPendingVerification ? Tone.Warn : Tone.Neutral}>
            {DRAFT_STATUS_LABEL[draft.status]}
          </Badge>
        )}
      </p>
      {draft ? (
        <>
          <p className="mb-2 font-medium">Subject: {draft.subject}</p>
          <pre className="whitespace-pre-wrap font-sans">{draft.body}</pre>
        </>
      ) : (
        <p className="italic text-slate-600">{missingReason}</p>
      )}
    </div>
  )
}

function DrawerBody({ opportunity }: { opportunity: Opportunity }) {
  const { drafts, eligibility, display } = opportunity
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{display.company}: {display.title}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {display.industry} · {display.domain} <StatusBadge status={eligibility.status} />
          {opportunity.proposedToLeads > 1 && (
            <Badge tone={Tone.Warn}>Proposed to {opportunity.proposedToLeads} leads: {opportunity.bestMatch?.candidateId}</Badge>
          )}
        </p>
      </div>

      <Section title="Score breakdown"><ScoreBreakdown opportunity={opportunity} /></Section>

      <Section title="Eligibility">
        <ul className="list-disc pl-5 text-sm">
          {eligibility.reasons.map((reason) => (
            <li key={reason.postingId}>{reason.postingId}: {reason.reason} <span className="text-slate-500">({reason.status})</span></li>
          ))}
        </ul>
        {eligibility.confirmWorkingHours && <p className="mt-2 text-sm text-amber-800">Confirm working hours (U.S. hours requirement unknown)</p>}
      </Section>

      <Section title="Candidate matches">
        {opportunity.matches ? (
          <div className="space-y-2">
            {opportunity.matches.map((match) => <MatchCard key={match.candidateId} match={match} />)}
            {opportunity.matches.length === 0 && <p className="text-sm italic">No candidate in pool for this role</p>}
          </div>
        ) : (
          <p className="text-sm italic text-slate-600">{opportunity.matchNote}</p>
        )}
      </Section>

      <Section title="Outreach drafts (never sent)">
        {drafts ? (
          <div className="grid gap-3 md:grid-cols-2">
            <DraftCard title="Variant A · candidate-first" draft={drafts.A} missingReason="Not generated: no verified candidate" />
            <DraftCard title="Variant B · hiring-process / speed-first" draft={drafts.B} />
          </div>
        ) : (
          <p className="text-sm italic text-slate-600">No drafts: ineligible role</p>
        )}
      </Section>

      <Section title="Linked duplicate postings">
        {opportunity.hasLinkedDuplicate ? (
          <>
            <p className="mb-2 text-sm">Merged postings: {opportunity.sourcePostingIds.join(', ')} (display from {display.postingId})</p>
            <table className="w-full">
              <thead><tr><th className={tableHeadClass}>Field</th><th className={tableHeadClass}>Values</th></tr></thead>
              <tbody>
                {opportunity.fieldConflicts.map((conflict) => (
                  <tr key={conflict.field}>
                    <td className={tableCellClass}>{conflict.field}</td>
                    <td className={tableCellClass}>{conflict.values.map((entry) => `${entry.postingId}: ${entry.value}`).join(' | ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm text-slate-600">No linked duplicates. Repeat postings are a signal of possible ongoing need, not proof of hiring difficulty.</p>
        )}
      </Section>
    </div>
  )
}

export function LeadDrawer({ opportunityId, onClose }: { opportunityId: string; onClose: () => void }) {
  const state = useApi<Opportunity>(`/api/opportunities/${opportunityId}`)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-10 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-slate-50 p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} className="mb-3 rounded bg-white px-3 py-1 text-sm ring-1 ring-slate-300">Close ✕</button>
        <ApiBoundary state={state}>{(opportunity) => <DrawerBody opportunity={opportunity} />}</ApiBoundary>
      </aside>
    </div>
  )
}
