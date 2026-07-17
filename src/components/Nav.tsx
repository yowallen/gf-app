import { site } from '../data/site'
import { type GateActor } from '../hooks/useGateAuth'
import { type ThemeId } from '../hooks/useTheme'
import {SignOutIcon} from '@phosphor-icons/react'

const links = [
  { href: '#timeline', label: 'Meets' },
  { href: '#quiz', label: 'Quiz' },
  { href: '#memes', label: 'Memes' },
  { href: '#dates', label: 'Dates' },
  { href: '#bucket', label: 'Bucket' },
  { href: '#milestones', label: 'Us' },
]

type NavProps = {
  theme: ThemeId
  actor: GateActor
  onThemeChange: (theme: ThemeId) => void
  onSignOut: () => void
}

export function Nav({ theme, actor, onThemeChange, onSignOut }: NavProps) {
  return (
    <nav className="nav" aria-label="Sections">
      <a className="nav__brand" href="#top">
        {site.nickname}
      </a>
      <div className="nav__end">
        <ul className="nav__links">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <div className="theme-toggle" role="group" aria-label="Garden theme">
          <button
            type="button"
            className={`theme-toggle__btn${theme === 'green' ? ' is-active' : ''}`}
            aria-pressed={theme === 'green'}
            aria-label="Meadow theme"
            onClick={() => onThemeChange('green')}
          >
            <span className="theme-toggle__swatch theme-toggle__swatch--green" />
            <span className="theme-toggle__label">Meadow</span>
          </button>
          <button
            type="button"
            className={`theme-toggle__btn${theme === 'purple' ? ' is-active' : ''}`}
            aria-pressed={theme === 'purple'}
            aria-label="Bloom theme"
            onClick={() => onThemeChange('purple')}
          >
            <span className="theme-toggle__swatch theme-toggle__swatch--purple" />
            <span className="theme-toggle__label">Bloom</span>
          </button>
        </div>
        <button
          type="button"
          className="nav__sign-out"
          onClick={onSignOut}
          aria-label={`Sign out ${actor.username}`}
        >
          <SignOutIcon size={16} style={{ marginTop: '5px' }} />
        </button>
      </div>
    </nav>
  )
}
