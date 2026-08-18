import { useState } from 'react'
import { site } from '../data/site'
import { useTheme } from '../hooks/useTheme'
import { GuestAlbum } from './GuestAlbum'
import { GuestGarden } from './GuestGarden'

type GuestTab = 'album' | 'garden'

type GuestAppProps = {
  canDelete: boolean
  /** Guests can plant; couple viewing cannot. */
  canPlant: boolean
  guestUsername: string
  onSignOut: () => void
  /** When set, shows a back control (couple visiting from home). */
  onBack?: () => void
}

export function GuestApp({
  canDelete,
  canPlant,
  guestUsername,
  onSignOut,
  onBack,
}: GuestAppProps) {
  const { theme, setTheme } = useTheme('guest')
  const [tab, setTab] = useState<GuestTab>('garden')

  return (
    <div className="guest-app">
      <header className="guest-top">
        <div className="guest-top__brand">
          <h1 className="guest-top__title">{site.nickname}</h1>
        </div>
        <div className="guest-top__actions">
          <div className="theme-toggle" role="group" aria-label="Garden theme">
            <button
              type="button"
              className={`theme-toggle__btn${theme === 'green' ? ' is-active' : ''}`}
              aria-pressed={theme === 'green'}
              onClick={() => setTheme('green')}
            >
              <span className="theme-toggle__swatch theme-toggle__swatch--green" />
              <span className="theme-toggle__label">Meadow</span>
            </button>
            <button
              type="button"
              className={`theme-toggle__btn${theme === 'purple' ? ' is-active' : ''}`}
              aria-pressed={theme === 'purple'}
              onClick={() => setTheme('purple')}
            >
              <span className="theme-toggle__swatch theme-toggle__swatch--purple" />
              <span className="theme-toggle__label">Bloom</span>
            </button>
          </div>
          {onBack ? (
            <button type="button" className="btn btn--ghost" onClick={onBack}>
              Back home
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={onSignOut}>
              Leave
            </button>
          )}
        </div>
      </header>

      <main className="guest-main">
        {tab === 'album' ? (
          <GuestAlbum guestName={guestUsername} />
        ) : (
          <GuestGarden canDelete={canDelete} canPlant={canPlant} guestUsername={guestUsername} />
        )}
      </main>

      <nav className="guest-tabs" aria-label="Guest sections">
        <button
          type="button"
          className={`guest-tabs__btn${tab === 'album' ? ' is-active' : ''}`}
          onClick={() => setTab('album')}
        >
          Album
        </button>
        <button
          type="button"
          className={`guest-tabs__btn${tab === 'garden' ? ' is-active' : ''}`}
          onClick={() => setTab('garden')}
        >
          Garden
        </button>
      </nav>
    </div>
  )
}
