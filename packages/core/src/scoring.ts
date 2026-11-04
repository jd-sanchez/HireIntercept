import { roundedShare, sum, times } from './math'
import { DEMAND_CAVEAT, SCORING_CONFIG } from './scoring-config'
import {
  EligibilityStatus,
  UsHoursRequired,
  type CandidateMatch,
  type Opportunity,
  type PriorityScore,
  type ScoreComponent,
  type ScoreLine,
} from './types'

type ScorableOpportunity = Pick<Opportunity, 'display' | 'eligibility' | 'repostCount' | 'hasLinkedDuplicate'>

const URGENT_PATTERN = /urgent start/i
const HIRING_MANAGER_PATTERN = /hiring manager listed/i

const buildComponent = (max: number, lines: ScoreLine[], note: string | null = null): ScoreComponent => ({
  points: sum(lines.map((line) => line.points)),
  max,
  lines,
  note,
})

const repostText = (count: number) => (count === 0 ? 'Not reposted' : count === 1 ? 'Reposted once' : `Reposted ${count} times`)

function scoreRemoteEligibility(opportunity: ScorableOpportunity): ScoreComponent {
  const config = SCORING_CONFIG.remoteEligibility
  const { status, summary } = opportunity.eligibility
  return status === EligibilityStatus.Eligible
    ? buildComponent(config.max, [{ text: summary, points: config.eligible }])
    : buildComponent(
        config.max,
        [{ text: `${summary}: reduced points pending human verification`, points: config.needsVerification }],
        'Score is provisional until eligibility is verified',
      )
}

function scoreCandidateFit(opportunity: ScorableOpportunity, bestMatch: CandidateMatch | null): ScoreComponent {
  const config = SCORING_CONFIG.candidateFit
  if (!bestMatch) return buildComponent(config.max, [{ text: 'No candidate in pool for this role', points: 0 }])

  const hoursRequired = opportunity.display.usHoursRequired
  const hoursLine: ScoreLine =
    hoursRequired === UsHoursRequired.Unknown
      ? { text: 'U.S. hours requirement unknown; confirm working hours', points: config.usHoursUnknown }
      : bestMatch.usHoursCompatible
        ? { text: 'Compatible with U.S. hours requirement', points: config.usHoursCompatible }
        : { text: 'Candidate cannot work required U.S. hours', points: 0 }

  return buildComponent(config.max, [
    {
      text: `Best candidate ${bestMatch.candidateId} covers ${bestMatch.matchedSkills.length}/${bestMatch.requiredSkillCount} required skills`,
      points: roundedShare(bestMatch.matchedSkills.length, bestMatch.requiredSkillCount, config.coverageMax),
    },
    { text: bestMatch.availableNow ? 'Available now' : 'Not available now', points: bestMatch.availableNow ? config.availableNow : 0 },
    hoursLine,
  ])
}

function scoreDemandSignals(opportunity: ScorableOpportunity): ScoreComponent {
  const config = SCORING_CONFIG.demandSignals
  const urgent = URGENT_PATTERN.test(opportunity.display.notes)
  const recent = opportunity.display.postedDaysAgo <= config.recentWithinDays
  return buildComponent(
    config.max,
    [
      { text: urgent ? 'Note says "urgent start"' : 'No urgent-start note', points: urgent ? config.urgentStart : 0 },
      { text: repostText(opportunity.repostCount), points: times(Math.min(opportunity.repostCount, config.repostCap), config.perRepost) },
      {
        text: opportunity.hasLinkedDuplicate ? 'Linked duplicate posting found' : 'No linked duplicate posting',
        points: opportunity.hasLinkedDuplicate ? config.linkedDuplicate : 0,
      },
      {
        text: recent ? `Posted within ${config.recentWithinDays} days` : `Posted more than ${config.recentWithinDays} days ago`,
        points: recent ? config.recentPosting : 0,
      },
    ],
    `Each of these is ${DEMAND_CAVEAT}.`,
  )
}

function scoreCommercialValue(opportunity: ScorableOpportunity): ScoreComponent {
  const config = SCORING_CONFIG.commercialValue
  const { salaryUsdPerYear, usHoursRequired, notes } = opportunity.display
  const tier = config.salaryTiers.find((candidateTier) => salaryUsdPerYear >= candidateTier.minSalary)
  const hoursKnown = usHoursRequired !== UsHoursRequired.Unknown
  const managerListed = HIRING_MANAGER_PATTERN.test(notes)
  return buildComponent(config.max, [
    { text: `Salary $${salaryUsdPerYear.toLocaleString('en-US')}`, points: tier?.points ?? config.salaryFloorPoints },
    { text: hoursKnown ? 'U.S. hours requirement known' : 'U.S. hours requirement unknown', points: hoursKnown ? config.usHoursKnown : 0 },
    { text: managerListed ? 'Hiring manager listed' : 'No hiring manager listed', points: managerListed ? config.hiringManagerListed : 0 },
  ])
}

export function scoreOpportunity(opportunity: ScorableOpportunity, bestMatch: CandidateMatch | null): PriorityScore | null {
  if (opportunity.eligibility.status === EligibilityStatus.Ineligible) return null

  const components = {
    remoteEligibility: scoreRemoteEligibility(opportunity),
    candidateFit: scoreCandidateFit(opportunity, bestMatch),
    demandSignals: scoreDemandSignals(opportunity),
    commercialValue: scoreCommercialValue(opportunity),
  }
  const total = sum(Object.values(components).map((component) => component.points))
  return { total, provisional: opportunity.eligibility.status === EligibilityStatus.NeedsVerification, components }
}
