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
import { useGateAuth } from './hooks/useGateAuth'
import { useTheme } from './hooks/useTheme'

function App() {
  const { unlocked, actor, unlock, signOut } = useGateAuth()
  const [ready, setReady] = useState(false)
  const onIntroComplete = useCallback(() => setReady(true), [])
  const { theme, setTheme } = useTheme(actor?.role ?? 'her')

  if (!unlocked || !actor) {
    return <LoginGate onUnlock={unlock} />
  }

  return (
    <>
      {!ready && <IntroLoading onComplete={onIntroComplete} />}
      {ready && (
        <>
          <Nav
            theme={theme}
            actor={actor}
            onThemeChange={setTheme}
            onSignOut={signOut}
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

export default App
