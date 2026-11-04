import { useState } from 'react'
import { CampaignScreen } from './screens/CampaignScreen'
import { OpportunitiesScreen } from './screens/OpportunitiesScreen'
import { SequencesScreen } from './screens/SequencesScreen'

enum Screen {
  Opportunities = 'Opportunities',
  Campaign = 'Campaign',
  Sequences = 'Sequences',
}

export function App() {
  const [screen, setScreen] = useState(Screen.Opportunities)
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">HireIntercept <span className="ml-2 text-sm font-normal text-ink-muted">prototype · synthetic data only</span></h1>
        <nav className="flex gap-1 rounded-card bg-sunken p-1">
          {Object.values(Screen).map((entry) => (
            <button
              key={entry}
              onClick={() => setScreen(entry)}
              aria-current={entry === screen ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${entry === screen ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'}`}
            >
              {entry}
            </button>
          ))}
        </nav>
      </header>
      {screen === Screen.Opportunities && <OpportunitiesScreen />}
      {screen === Screen.Campaign && <CampaignScreen />}
      {screen === Screen.Sequences && <SequencesScreen />}
    </div>
  )
}
