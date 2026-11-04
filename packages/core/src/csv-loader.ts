import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import type { z } from 'zod'
import type { ImportResult, InvalidRow } from './types'

const HEADER_LINE_COUNT = 1

export function parseCsv<T>(text: string, schema: z.ZodType<T>): ImportResult<T> {
  const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: false })
  const records: T[] = []
  const invalidRows: InvalidRow[] = []
  let totalRows = 0

  data.forEach((row, index) => {
    const isBlankLine = Object.values(row).every((value) => value === undefined || value === '')
    if (isBlankLine) return
    totalRows += 1
    const parsed = schema.safeParse(row)
    if (parsed.success) {
      records.push(parsed.data)
      return
    }
    const reason = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ')
    invalidRows.push({ rowNumber: index + 1 + HEADER_LINE_COUNT, reason })
  })

  return { records, invalidRows, totalRows }
}

export function loadCsvFile<T>(filePath: string, schema: z.ZodType<T>): ImportResult<T> {
  return parseCsv(readFileSync(filePath, 'utf8'), schema)
}
