import { useCallback, useState } from 'react'
import { BucketList } from './components/BucketList'
import { DateIdeas } from './components/DateIdeas'
import { Hero } from './components/Hero'
import { IntroLoading } from './components/IntroLoading'
import { LoginGate } from './components/LoginGate'
import { LoveLetter } from './components/LoveLetter'
import { MemeCorner } from './components/MemeCorner'
import { Milestones } from './components/Milestones'
import { Nav } from './components/Nav'
import { PhotoTimeline } from './components/PhotoTimeline'
import { Quiz } from './components/Quiz'
import { useBootstrapSync } from './hooks/useBootstrapSync'
import { useGateAuth, type GateActor } from './hooks/useGateAuth'
import { useTheme } from './hooks/useTheme'

function AuthenticatedApp({
  actor,
  onSignOut,
}: {
  actor: GateActor
  onSignOut: () => void
}) {
  const { theme, setTheme } = useTheme(actor.role)
  const { ready: dataReady } = useBootstrapSync(actor.role, actor.username)
  const [homeReady, setHomeReady] = useState(false)
  const onIntroComplete = useCallback(() => setHomeReady(true), [])

  return (
    <>
      {!homeReady ? (
        <IntroLoading dataReady={dataReady} onComplete={onIntroComplete} />
      ) : (
        <>
          <Nav
            theme={theme}
            actor={actor}
            onThemeChange={setTheme}
            onSignOut={onSignOut}
          />
          <main>
            <Hero />
            <PhotoTimeline addedBy={actor.username} />
            <Quiz actor={actor} />
            <MemeCorner />
            <DateIdeas addedBy={actor.username} />
            <BucketList addedBy={actor.username} />
            <Milestones />
          </main>
          <LoveLetter actor={actor} />
        </>
      )}
    </>
  )
}

function App() {
  const { unlocked, actor, unlock, signOut } = useGateAuth()

  if (!unlocked || !actor) {
    return <LoginGate onUnlock={unlock} />
  }

  return <AuthenticatedApp actor={actor} onSignOut={signOut} />
}

export default App
