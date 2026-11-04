import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { loadDataset } from '../src/dataset'

let app: FastifyInstance
beforeAll(async () => {
  app = buildApp(await loadDataset())
})
afterAll(() => app.close())

const get = async (url: string) => {
  const response = await app.inject({ method: 'GET', url })
  return { status: response.statusCode, body: response.json() }
}

describe('GET /api/opportunities', () => {
  it('lists 28 opportunities sorted by score, unscored last', async () => {
    const { status, body } = await get('/api/opportunities')
    expect(status).toBe(200)
    expect(body).toHaveLength(28)
    const scores = body.map((item: { score: number | null }) => item.score)
    expect(scores.slice(0, 18).every((score: number | null) => score !== null)).toBe(true)
    expect(scores.slice(18).every((score: number | null) => score === null)).toBe(true)
    expect([...scores.slice(0, 18)].sort((left: number, right: number) => right - left)).toEqual(scores.slice(0, 18))
  })

  it('filters by status, industry, role and minimum score', async () => {
    expect((await get('/api/opportunities?status=eligible')).body).toHaveLength(10)
    expect((await get('/api/opportunities?industry=accounting&role=Bookkeeper')).body).toHaveLength(3)
    const high = (await get('/api/opportunities?minScore=70')).body
    expect(high.length).toBeGreaterThan(0)
    expect(high.every((item: { score: number }) => item.score >= 70)).toBe(true)
  })

  it('sorts by company and treats empty params as unset', async () => {
    const { body } = await get('/api/opportunities?sort=company&status=')
    const companies = body.map((item: { company: string }) => item.company)
    expect(companies).toEqual([...companies].sort((left: string, right: string) => left.localeCompare(right)))
    expect(body).toHaveLength(28)
  })

  it('rejects invalid params with 400', async () => {
    expect((await get('/api/opportunities?status=banana')).status).toBe(400)
    expect((await get('/api/opportunities?minScore=abc')).status).toBe(400)
  })

  it('shows the reason instead of a score for ineligible rows', async () => {
    const { body } = await get('/api/opportunities?status=ineligible')
    expect(body).toHaveLength(10)
    expect(body[0].score).toBeNull()
    expect(body[0].notScoredReason).toMatch(/^Not scored: /)
  })
})

describe('GET /api/opportunities/:id', () => {
  it('returns full detail, resolving merged posting ids', async () => {
    const { status, body } = await get('/api/opportunities/JOB-029')
    expect(status).toBe(200)
    expect(body.id).toBe('JOB-002')
    expect(body.sourcePostingIds).toEqual(['JOB-002', 'JOB-029'])
    expect(body.fieldConflicts.length).toBeGreaterThan(0)
    expect(body.score.components.candidateFit.reasons.length).toBeGreaterThan(0)
    expect(body.drafts.B).toBeTruthy()
    expect(body.matches[0].synthetic).toBe(true)
  })

  it('returns 404 for unknown ids', async () => {
    expect((await get('/api/opportunities/JOB-999')).status).toBe(404)
  })
})

describe('other endpoints', () => {
  it('GET /api/import-summary reports counts, no invalid rows and two duplicate groups', async () => {
    const { body } = await get('/api/import-summary')
    expect(body.files.jobs).toMatchObject({ totalRows: 30, validRows: 30, invalidRows: [] })
    expect(body.canonicalOpportunities).toBe(28)
    expect(body.eligibilityCounts).toEqual({ eligible: 10, needs_verification: 8, ineligible: 10 })
    expect(body.duplicateGroups.map((group: { canonicalId: string }) => group.canonicalId)).toEqual(['JOB-002', 'JOB-004'])
  })

  it('GET /api/campaign honours scope and defaults to all', async () => {
    expect((await get('/api/campaign')).body.metrics.overall.messagesSent).toBe(26)
    expect((await get('/api/campaign?scope=eligible')).body.metrics.overall.messagesSent).toBe(8)
    expect((await get('/api/campaign?scope=nope')).status).toBe(400)
  })

  it('GET /api/sequences returns timelines and the suppression list', async () => {
    const { body } = await get('/api/sequences')
    expect(body.asOfDay).toBe(4)
    expect(body.contacts.length).toBeGreaterThan(0)
    expect(body.suppressionList.length).toBeGreaterThan(0)
  })

  it('GET /api/filters lists distinct industries and roles', async () => {
    const { body } = await get('/api/filters')
    expect(body.industries).toContain('Accounting')
    expect(body.roles).toContain('Bookkeeper')
    expect(new Set(body.roles).size).toBe(body.roles.length)
  })
})
