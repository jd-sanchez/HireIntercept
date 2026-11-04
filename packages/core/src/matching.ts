import { ratio, roundedShare } from './math'
import { normalizeSkill } from './normalize'
import { UsHoursRequired, YesNo, type Candidate, type CandidateMatch, type JobPosting } from './types'

export const CONFIRM_HOURS_NOTE = 'Confirm working hours'

function matchCandidate(job: JobPosting, candidate: Candidate): CandidateMatch {
  const candidateSkillsByToken = new Map(candidate.skills.map((skill) => [normalizeSkill(skill), skill]))
  const matchedSkills: string[] = []
  const missingSkills: string[] = []
  for (const required of job.requiredSkills) {
    const listed = candidateSkillsByToken.get(normalizeSkill(required))
    if (listed) matchedSkills.push(listed)
    else missingSkills.push(required)
  }

  const requiredSkillCount = job.requiredSkills.length
  const availableNow = candidate.availableNow === YesNo.Yes
  const usHoursAvailable = candidate.usHoursAvailable === YesNo.Yes
  const hoursRequired = job.usHoursRequired
  const usHoursCompatible =
    hoursRequired === UsHoursRequired.Unknown ? null : hoursRequired === UsHoursRequired.No || usHoursAvailable

  const gaps = [
    ...missingSkills.map((skill) => `Missing skill: ${skill}`),
    ...(availableNow ? [] : ['Not available now']),
    ...(usHoursAvailable || hoursRequired === UsHoursRequired.No ? [] : ['Cannot work U.S. hours']),
  ]

  return {
    candidateId: candidate.candidateId,
    roleSpecialty: candidate.roleSpecialty,
    matchedSkills,
    missingSkills,
    requiredSkillCount,
    coverage: ratio(matchedSkills.length, requiredSkillCount),
    coveragePercent: roundedShare(matchedSkills.length, requiredSkillCount, 100),
    availableNow,
    usHoursAvailable,
    usHoursCompatible,
    gaps,
    notes: hoursRequired === UsHoursRequired.Unknown ? [CONFIRM_HOURS_NOTE] : [],
    verified: missingSkills.length === 0 && availableNow && usHoursCompatible !== false,
    synthetic: true,
  }
}

const rank = (left: CandidateMatch, right: CandidateMatch): number =>
  Number(right.verified) - Number(left.verified) ||
  right.matchedSkills.length - left.matchedSkills.length ||
  left.candidateId.localeCompare(right.candidateId)

export const matchCandidates = (job: JobPosting, candidates: Candidate[]): CandidateMatch[] =>
  candidates
    .map((candidate) => matchCandidate(job, candidate))
    .filter((match) => match.matchedSkills.length > 0)
    .sort(rank)
