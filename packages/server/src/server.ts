import { buildApp } from './app'
import { DEFAULT_DATA_DIR, loadDataset } from './dataset'

const port = Number(process.env.PORT ?? 3001)
const dataset = await loadDataset(process.env.DATA_DIR ?? DEFAULT_DATA_DIR)
const app = buildApp(dataset, true)

app.log.info(
  { jobs: dataset.jobs.records.length, candidates: dataset.candidates.records.length, events: dataset.events.records.length },
  'dataset loaded into memory',
)
await app.listen({ port, host: '127.0.0.1' })
