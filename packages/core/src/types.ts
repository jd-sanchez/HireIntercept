export enum RemotePolicy {
  Global = 'GLOBAL',
  UsOnly = 'US_ONLY',
  Onsite = 'ONSITE',
  RemoteUnspecified = 'REMOTE_UNSPECIFIED',
}

export enum UsHoursRequired {
  Yes = 'yes',
  No = 'no',
  Unknown = 'unknown',
}

export enum YesNo {
  Yes = 'yes',
  No = 'no',
}

export enum Variant {
  A = 'A',
  B = 'B',
}

export enum EventType {
  Sent = 'sent',
  Delivered = 'delivered',
  Opened = 'opened',
  RepliedPositive = 'replied_positive',
  RepliedNegative = 'replied_negative',
  Unsubscribed = 'unsubscribed',
  Bounced = 'bounced',
  MeetingBooked = 'meeting_booked',
  ClientWon = 'client_won',
}

export enum EligibilityStatus {
  Eligible = 'eligible',
  NeedsVerification = 'needs_verification',
  Ineligible = 'ineligible',
}

export enum EligibilityCode {
  Onsite = 'ONSITE',
  UsOnly = 'US_ONLY',
  LicenseRequired = 'LICENSE_REQUIRED',
  RemoteUnspecified = 'REMOTE_UNSPECIFIED',
  PossibleLocalRestriction = 'POSSIBLE_LOCAL_RESTRICTION',
  GlobalRemote = 'GLOBAL_REMOTE',
}

export enum DraftStatus {
  Ready = 'ready',
  HeldPendingVerification = 'held_pending_verification',
}

export interface JobPosting {
  postingId: string
  company: string
  domain: string
  industry: string
  companyEmployees: number
  title: string
  requiredSkills: string[]
  remotePolicy: RemotePolicy
  usHoursRequired: UsHoursRequired
  postedDaysAgo: number
  repostCount: number
  salaryUsdPerYear: number
  notes: string
}

export interface Candidate {
  candidateId: string
  roleSpecialty: string
  skills: string[]
  usHoursAvailable: YesNo
  availableNow: YesNo
}

export interface CampaignEvent {
  eventId: string
  postingId: string
  variant: Variant
  step: number
  eventType: EventType
  eventDay: number
}

export interface PostingEligibility {
  postingId: string
  status: EligibilityStatus
  code: EligibilityCode
  reason: string
  /** Other rules that also matched; the first match decides the status. */
  alsoReasons: string[]
}

export interface FieldConflict {
  field: string
  values: { postingId: string; value: string }[]
}

export interface CandidateMatch {
  candidateId: string
  roleSpecialty: string
  matchedSkills: string[]
  missingSkills: string[]
  requiredSkillCount: number
  coverage: number
  coveragePercent: number
  availableNow: boolean
  usHoursAvailable: boolean
  usHoursCompatible: boolean | null
  gaps: string[]
  notes: string[]
  verified: boolean
  synthetic: true
}

export interface ScoreLine {
  text: string
  points: number
}

export interface ScoreComponent {
  points: number
  max: number
  lines: ScoreLine[]
  /** One caveat for the whole component, shown once instead of on every line. */
  note: string | null
}

export interface PriorityScore {
  total: number
  provisional: boolean
  components: {
    remoteEligibility: ScoreComponent
    candidateFit: ScoreComponent
    demandSignals: ScoreComponent
    commercialValue: ScoreComponent
  }
}

export interface EmailDraft {
  variant: Variant
  status: DraftStatus
  subject: string
  body: string
}

export interface OpportunityDrafts {
  A: EmailDraft | null
  aNotGeneratedReason: string | null
  B: EmailDraft
}

export interface OpportunityEligibility {
  status: EligibilityStatus
  summary: string
  reasons: PostingEligibility[]
  confirmWorkingHours: boolean
}

export interface Opportunity {
  id: string
  sourcePostingIds: string[]
  display: JobPosting
  eligibility: OpportunityEligibility
  repostCount: number
  hasLinkedDuplicate: boolean
  fieldConflicts: FieldConflict[]
  matches: CandidateMatch[] | null
  matchNote: string | null
  bestMatch: CandidateMatch | null
  proposedToLeads: number
  score: PriorityScore | null
  notScoredReason: string | null
  drafts: OpportunityDrafts | null
}

export interface InvalidRow {
  rowNumber: number
  reason: string
}

export interface ImportResult<T> {
  records: T[]
  invalidRows: InvalidRow[]
  totalRows: number
}

export interface OpportunityListItem {
  id: string
  sourcePostingIds: string[]
  company: string
  role: string
  industry: string
  status: EligibilityStatus
  statusReason: string
  score: number | null
  provisional: boolean
  notScoredReason: string | null
  hasLinkedDuplicate: boolean
  bestCandidate: {
    candidateId: string
    verified: boolean
    confirmHours: boolean
    gaps: string[]
    coveragePercent: number
    proposedToLeads: number
  } | null
}

export interface FilterOptions {
  industries: string[]
  roles: string[]
}

export interface ImportFileSummary {
  totalRows: number
  validRows: number
  invalidRows: InvalidRow[]
}

export interface DuplicateGroupSummary {
  canonicalId: string
  sourcePostingIds: string[]
  key: { domain: string; title: string }
  mergedStatus: EligibilityStatus
  statusReasons: PostingEligibility[]
  displayPostingId: string
  repostCount: number
  fieldConflicts: FieldConflict[]
  mergeRules: string[]
}

export interface ImportSummary {
  files: { jobs: ImportFileSummary; candidates: ImportFileSummary; events: ImportFileSummary }
  canonicalOpportunities: number
  eligibilityCounts: Record<EligibilityStatus, number>
  duplicateGroups: DuplicateGroupSummary[]
}
