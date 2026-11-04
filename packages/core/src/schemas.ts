import { z } from 'zod'
import { EventType, RemotePolicy, UsHoursRequired, Variant, YesNo } from './types'

const skillList = z
  .string()
  .transform((raw) => raw.split(';').map((skill) => skill.trim()).filter(Boolean))
  .refine((skills) => skills.length > 0, 'at least one skill is required')

const nonEmpty = z.string().trim().min(1)
const count = z.coerce.number().int().nonnegative()

export const jobRowSchema = z
  .strictObject({
    posting_id: nonEmpty,
    company: nonEmpty,
    domain: nonEmpty,
    industry: nonEmpty,
    company_employees: count,
    title: nonEmpty,
    required_skills: skillList,
    remote_policy: z.enum(RemotePolicy),
    us_hours_required: z.enum(UsHoursRequired),
    posted_days_ago: count,
    repost_count: count,
    salary_usd_per_year: count,
    notes: z.string().trim(),
  })
  .transform((row) => ({
    postingId: row.posting_id,
    company: row.company,
    domain: row.domain,
    industry: row.industry,
    companyEmployees: row.company_employees,
    title: row.title,
    requiredSkills: row.required_skills,
    remotePolicy: row.remote_policy,
    usHoursRequired: row.us_hours_required,
    postedDaysAgo: row.posted_days_ago,
    repostCount: row.repost_count,
    salaryUsdPerYear: row.salary_usd_per_year,
    notes: row.notes,
  }))

export const candidateRowSchema = z
  .strictObject({
    candidate_id: nonEmpty,
    role_specialty: nonEmpty,
    skills: skillList,
    us_hours_available: z.enum(YesNo),
    available_now: z.enum(YesNo),
  })
  .transform((row) => ({
    candidateId: row.candidate_id,
    roleSpecialty: row.role_specialty,
    skills: row.skills,
    usHoursAvailable: row.us_hours_available,
    availableNow: row.available_now,
  }))

export const eventRowSchema = z
  .strictObject({
    event_id: nonEmpty,
    posting_id: nonEmpty,
    variant: z.enum(Variant),
    step: count,
    event_type: z.enum(EventType),
    event_day: count,
  })
  .transform((row) => ({
    eventId: row.event_id,
    postingId: row.posting_id,
    variant: row.variant,
    step: row.step,
    eventType: row.event_type,
    eventDay: row.event_day,
  }))
