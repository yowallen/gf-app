import { useCallback, useState } from 'react'
import wateringCanImage from './assets/watering-can.png'
import { BucketList } from './components/BucketList'
import { DateIdeas } from './components/DateIdeas'
import { GuestApp } from './components/GuestApp'
import { Hero } from './components/Hero'
import { IntroLoading } from './components/IntroLoading'
import { LoginGate } from './components/LoginGate'
import { LoveLetter } from './components/LoveLetter'
import { MemeCorner } from './components/MemeCorner'
import { Milestones } from './components/Milestones'
import { Nav } from './components/Nav'
import { PhotoTimeline } from './components/PhotoTimeline'
import { Quiz } from './components/Quiz'
import { isCoupleRole } from './data/auth'
import { useBootstrapSync } from './hooks/useBootstrapSync'
import { useGateAuth, type GateActor } from './hooks/useGateAuth'
import { useTheme } from './hooks/useTheme'

type CoupleActor = GateActor & { role: 'her' | 'him' }

type CoupleAppProps = Readonly<{
  actor: CoupleActor
  onSignOut: () => void
}>

function CoupleApp({ actor, onSignOut }: CoupleAppProps) {
  const { theme, setTheme } = useTheme(actor.role)
  const { ready: dataReady } = useBootstrapSync(actor.role, actor.username)
  const [homeReady, setHomeReady] = useState(false)
  const [guestView, setGuestView] = useState(false)
  const onIntroComplete = useCallback(() => setHomeReady(true), [])

  if (guestView) {
    return (
      <GuestApp
        canDelete
        canPlant={false}
        guestUsername="guest"
        onSignOut={onSignOut}
        onBack={() => setGuestView(false)}
      />
    )
  }

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
          <button
            type="button"
            className="guest-garden-float"
            onClick={() => setGuestView(true)}
            aria-label="Open guest garden"
          >
            <img src={wateringCanImage} alt="" />
          </button>
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

  if (actor.role === 'guest') {
    return <GuestApp canDelete={false} canPlant guestUsername={actor.username} onSignOut={signOut} />
  }

  if (!isCoupleRole(actor.role)) {
    return <LoginGate onUnlock={unlock} />
  }

  const coupleActor = actor as CoupleActor
  return <CoupleApp actor={coupleActor} onSignOut={signOut} />
}

export default App
