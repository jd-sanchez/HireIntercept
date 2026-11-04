import { roundedShare, sum, times } from './math'
import { DEMAND_CAVEAT, SCORING_CONFIG } from './scoring-config'
import {
  EligibilityStatus,
  UsHoursRequired,
  type CandidateMatch,
  type Opportunity,
  type PriorityScore,
  type ScoreComponent,
} from './types'

type ScorableOpportunity = Pick<Opportunity, 'display' | 'eligibility' | 'repostCount' | 'hasLinkedDuplicate'>

const URGENT_PATTERN = /urgent start/i
const HIRING_MANAGER_PATTERN = /hiring manager listed/i

const sumPoints = (reasons: { points: number; reason: string }[]): { points: number; reasons: string[] } => ({
  points: sum(reasons.map((entry) => entry.points)),
  reasons: reasons.map((entry) => entry.reason),
})

function scoreRemoteEligibility(opportunity: ScorableOpportunity): ScoreComponent {
  const config = SCORING_CONFIG.remoteEligibility
  const verified = opportunity.eligibility.status === EligibilityStatus.Eligible
  return {
    points: verified ? config.eligible : config.needsVerification,
    max: config.max,
    reasons: verified
      ? [`${opportunity.eligibility.summary}: full eligibility points`]
      : [
          `${opportunity.eligibility.summary}: reduced points pending human verification`,
          'Score is provisional until eligibility is verified',
        ],
  }
}

function scoreCandidateFit(opportunity: ScorableOpportunity, bestMatch: CandidateMatch | null): ScoreComponent {
  const config = SCORING_CONFIG.candidateFit
  if (!bestMatch) return { points: 0, max: config.max, reasons: ['No candidate in pool for this role'] }

  const coveragePoints = roundedShare(bestMatch.matchedSkills.length, bestMatch.requiredSkillCount, config.coverageMax)
  const availabilityPoints = bestMatch.availableNow ? config.availableNow : 0
  const hoursRequired = opportunity.display.usHoursRequired
  const hoursPoints =
    hoursRequired === UsHoursRequired.Unknown
      ? config.usHoursUnknown
      : bestMatch.usHoursCompatible
        ? config.usHoursCompatible
        : 0

  const hoursReason =
    hoursRequired === UsHoursRequired.Unknown
      ? `U.S. hours requirement unknown (+${hoursPoints}); confirm working hours`
      : bestMatch.usHoursCompatible
        ? `Compatible with U.S. hours requirement (+${hoursPoints})`
        : 'Candidate cannot work required U.S. hours (+0)'

  return {
    points: sum([coveragePoints, availabilityPoints, hoursPoints]),
    max: config.max,
    reasons: [
      `Best candidate ${bestMatch.candidateId} covers ${bestMatch.matchedSkills.length}/${bestMatch.requiredSkillCount} required skills (+${coveragePoints})`,
      bestMatch.availableNow ? `Available now (+${availabilityPoints})` : 'Not available now (+0)',
      hoursReason,
    ],
  }
}

function scoreDemandSignals(opportunity: ScorableOpportunity): ScoreComponent {
  const config = SCORING_CONFIG.demandSignals
  const withCaveat = (points: number, text: string) => ({ points, reason: `${text}: ${DEMAND_CAVEAT}` })
  const urgent = URGENT_PATTERN.test(opportunity.display.notes)
  const repostPoints = times(Math.min(opportunity.repostCount, config.repostCap), config.perRepost)
  const recent = opportunity.display.postedDaysAgo <= config.recentWithinDays

  const { points, reasons } = sumPoints([
    withCaveat(urgent ? config.urgentStart : 0, urgent ? `Note says "urgent start" (+${config.urgentStart})` : 'No urgent-start note (+0)'),
    withCaveat(repostPoints, `Reposted ${opportunity.repostCount} time(s) (+${repostPoints})`),
    withCaveat(
      opportunity.hasLinkedDuplicate ? config.linkedDuplicate : 0,
      opportunity.hasLinkedDuplicate ? `Linked duplicate posting found (+${config.linkedDuplicate})` : 'No linked duplicate posting (+0)',
    ),
    withCaveat(
      recent ? config.recentPosting : 0,
      recent ? `Posted within ${config.recentWithinDays} days (+${config.recentPosting})` : `Posted more than ${config.recentWithinDays} days ago (+0)`,
    ),
  ])
  return { points, max: config.max, reasons }
}

function scoreCommercialValue(opportunity: ScorableOpportunity): ScoreComponent {
  const config = SCORING_CONFIG.commercialValue
  const { salaryUsdPerYear, usHoursRequired, notes } = opportunity.display
  const tier = config.salaryTiers.find((candidateTier) => salaryUsdPerYear >= candidateTier.minSalary)
  const salaryPoints = tier?.points ?? config.salaryFloorPoints
  const hoursKnown = usHoursRequired !== UsHoursRequired.Unknown
  const managerListed = HIRING_MANAGER_PATTERN.test(notes)

  const { points, reasons } = sumPoints([
    { points: salaryPoints, reason: `Salary $${salaryUsdPerYear.toLocaleString('en-US')} (+${salaryPoints})` },
    {
      points: hoursKnown ? config.usHoursKnown : 0,
      reason: hoursKnown ? `U.S. hours requirement known (+${config.usHoursKnown})` : 'U.S. hours requirement unknown (+0)',
    },
    {
      points: managerListed ? config.hiringManagerListed : 0,
      reason: managerListed ? `Hiring manager listed (+${config.hiringManagerListed})` : 'No hiring manager listed (+0)',
    },
  ])
  return { points, max: config.max, reasons }
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
