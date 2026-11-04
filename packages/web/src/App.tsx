import { useState, type ReactNode } from 'react'
import { AppShell, type NavItem } from './components/AppShell'
import { CampaignScreen } from './screens/CampaignScreen'
import { OpportunitiesScreen } from './screens/OpportunitiesScreen'
import { SequencesScreen } from './screens/SequencesScreen'

enum Screen {
  Opportunities = 'Opportunities',
  Campaign = 'Campaign',
  Sequences = 'Sequences',
}

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>
)

const NAV_ITEMS: NavItem<Screen>[] = [
  { id: Screen.Opportunities, label: 'Opportunities', icon: icon(<><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3" /></>) },
  { id: Screen.Campaign, label: 'Campaign', icon: icon(<path d="M4 16V9m6 7V4m6 12v-5" />) },
  { id: Screen.Sequences, label: 'Sequences', icon: icon(<path d="M3 5h5m-5 5h9m-9 5h13" />) },
]

export function App() {
  const [screen, setScreen] = useState(Screen.Opportunities)
  return (
    <AppShell items={NAV_ITEMS} activeId={screen} onNavigate={setScreen}>
      {screen === Screen.Opportunities && <OpportunitiesScreen />}
      {screen === Screen.Campaign && <CampaignScreen />}
      {screen === Screen.Sequences && <SequencesScreen />}
    </AppShell>
  )
}
