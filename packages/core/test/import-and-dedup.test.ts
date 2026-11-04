import { describe, expect, it } from 'vitest'
import { EligibilityStatus, jobRowSchema, parseCsv } from '../src'
import { candidatesImport, eventsImport, findOpportunity, idsWithStatus, jobsImport, opportunities } from './dataset'

describe('import', () => {
  it('loads every row of all three files with no invalid rows', () => {
    expect(jobsImport.records).toHaveLength(30)
    expect(candidatesImport.records).toHaveLength(10)
    expect(eventsImport.totalRows).toBeGreaterThan(0)
    expect(eventsImport.records).toHaveLength(eventsImport.totalRows)
    for (const result of [jobsImport, candidatesImport, eventsImport]) expect(result.invalidRows).toEqual([])
  })

  it('parses semicolon-separated skills', () => {
    expect(jobsImport.records[0]?.requiredSkills).toEqual(['QuickBooks', 'reconciliation', 'Excel'])
  })

  it('collects invalid rows with row number and reason instead of crashing', () => {
    const header = 'posting_id,company,domain,industry,company_employees,title,required_skills,remote_policy,us_hours_required,posted_days_ago,repost_count,salary_usd_per_year,notes'
    const good = 'JOB-X1,Acme,acme.example,Accounting,10,Bookkeeper,Excel,GLOBAL,yes,1,0,40000,note'
    const bad = 'JOB-X2,Acme,acme.example,Accounting,ten,Bookkeeper,Excel,MARS,yes,1,0,40000,note'
    const result = parseCsv([header, good, bad, ''].join('\r\n'), jobRowSchema)
    expect(result.records).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0]?.rowNumber).toBe(3)
    expect(result.invalidRows[0]?.reason).toMatch(/company_employees/)
    expect(result.invalidRows[0]?.reason).toMatch(/remote_policy/)
  })
})

describe('eligibility', () => {
  it('applies the rules in order', () => {
    const reasonOf = (postingId: string) =>
      jobsImport.records.find((job) => job.postingId === postingId) && findOpportunity(postingId).eligibility.reasons.find((entry) => entry.postingId === postingId)
    expect(reasonOf('JOB-010')?.reason).toBe('On-site role')
    expect(reasonOf('JOB-003')?.reason).toBe('U.S.-only role')
    expect(reasonOf('JOB-009')?.reason).toBe('U.S.-only role')
    expect(reasonOf('JOB-005')?.reason).toBe('Remote eligibility not stated')
    expect(reasonOf('JOB-006')?.reason).toBe('Note mentions possible local restriction')
    expect(reasonOf('JOB-001')?.status).toBe(EligibilityStatus.Eligible)
  })

  it('records other matching rules without changing the decision', () => {
    const alsoOf = (postingId: string) =>
      findOpportunity(postingId).eligibility.reasons.find((entry) => entry.postingId === postingId)?.alsoReasons
    expect(alsoOf('JOB-009')).toEqual(['Requires local license'])
    expect(alsoOf('JOB-019')).toEqual(['Requires local license'])
    expect(alsoOf('JOB-030')).toEqual(['Note mentions possible local restriction'])
    expect(alsoOf('JOB-003')).toEqual([])
    expect(alsoOf('JOB-001')).toEqual([])
  })

  it('does not treat HIPAA awareness as a license, and unknown hours does not block', () => {
    expect(findOpportunity('JOB-007').eligibility.reasons[0]?.code).toBe('US_ONLY')
    expect(findOpportunity('JOB-001').eligibility.status).toBe(EligibilityStatus.Eligible)
    expect(findOpportunity('JOB-001').eligibility.confirmWorkingHours).toBe(true)
  })
})

describe('dedup', () => {
  it('produces 28 canonical opportunities from 30 postings', () => {
    expect(opportunities).toHaveLength(28)
  })

  it('creates exactly two groups, keyed by domain + title', () => {
    const groups = opportunities.filter((opportunity) => opportunity.hasLinkedDuplicate)
    expect(groups.map((group) => [group.id, group.sourcePostingIds])).toEqual([
      ['JOB-002', ['JOB-002', 'JOB-029']],
      ['JOB-004', ['JOB-004', 'JOB-030']],
    ])
  })

  it('does not merge the same title at different domains', () => {
    expect(findOpportunity('JOB-001').sourcePostingIds).toEqual(['JOB-001'])
    expect(findOpportunity('JOB-011').sourcePostingIds).toEqual(['JOB-011'])
  })

  it('reports field conflicts for the Northline group', () => {
    const fields = findOpportunity('JOB-029').fieldConflicts.map((conflict) => conflict.field)
    expect(fields).toEqual(expect.arrayContaining(['companyEmployees', 'salaryUsdPerYear']))
    const salary = findOpportunity('JOB-029').fieldConflicts.find((conflict) => conflict.field === 'salaryUsdPerYear')
    expect(salary?.values).toEqual([
      { postingId: 'JOB-002', value: '52000' },
      { postingId: 'JOB-029', value: '70000' },
    ])
  })

  it('uses the most restrictive eligibility and keeps reasons from every member (Harborwell)', () => {
    const harborwell = findOpportunity('JOB-030')
    expect(harborwell.eligibility.status).toBe(EligibilityStatus.NeedsVerification)
    expect(harborwell.eligibility.reasons.map((entry) => entry.postingId)).toEqual(['JOB-004', 'JOB-030'])
    expect(harborwell.fieldConflicts.map((conflict) => conflict.field)).toContain('remotePolicy')
  })

  it('takes display fields from the most recent posting and the max repost count', () => {
    const northline = findOpportunity('JOB-029')
    expect(northline.display.postingId).toBe('JOB-002')
    expect(northline.repostCount).toBe(0)
    expect(findOpportunity('JOB-030').repostCount).toBe(3)
    expect(findOpportunity('JOB-030').display.postingId).toBe('JOB-004')
  })

  it('yields the expected 10 / 8 / 10 eligibility split', () => {
    expect(idsWithStatus('eligible')).toEqual(['JOB-001', 'JOB-002', 'JOB-008', 'JOB-011', 'JOB-014', 'JOB-016', 'JOB-021', 'JOB-022', 'JOB-026', 'JOB-028'])
    expect(idsWithStatus('needs_verification')).toEqual(['JOB-004', 'JOB-005', 'JOB-006', 'JOB-012', 'JOB-015', 'JOB-018', 'JOB-024', 'JOB-025'])
    expect(idsWithStatus('ineligible')).toEqual(['JOB-003', 'JOB-007', 'JOB-009', 'JOB-010', 'JOB-013', 'JOB-017', 'JOB-019', 'JOB-020', 'JOB-023', 'JOB-027'])
  })
})
