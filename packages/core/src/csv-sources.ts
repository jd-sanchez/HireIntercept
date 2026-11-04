import { loadCsvFile } from './csv-loader'
import type { CandidateProvider, EventIngestor, ProspectSource } from './integrations'
import { candidateRowSchema, eventRowSchema, jobRowSchema } from './schemas'

export class CsvProspectSource implements ProspectSource {
  constructor(private readonly filePath: string) {}
  async fetchJobPostings() {
    return loadCsvFile(this.filePath, jobRowSchema)
  }
}

export class CsvCandidateProvider implements CandidateProvider {
  constructor(private readonly filePath: string) {}
  async fetchCandidates() {
    return loadCsvFile(this.filePath, candidateRowSchema)
  }
}

export class CsvEventIngestor implements EventIngestor {
  constructor(private readonly filePath: string) {}
  async fetchEvents() {
    return loadCsvFile(this.filePath, eventRowSchema)
  }
}
