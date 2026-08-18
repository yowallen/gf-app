import { useState, type FormEvent } from 'react'
import {
  gateAuth,
  isValidGuestUsername,
  type CoupleRole,
  type GateRole,
} from '../data/auth'
import { site } from '../data/site'
import {
  checkPasswordForRole,
  resolveGateRole,
  type GateStep,
} from '../hooks/useGateAuth'

type LoginGateProps = {
  onUnlock: (role: GateRole, usernameOverride?: string) => void
}

export function LoginGate({ onUnlock }: LoginGateProps) {
  const [step, setStep] = useState<GateStep>('username')
  const [role, setRole] = useState<CoupleRole | null>(null)
  const [username, setUsername] = useState('')
  const [guestUsername, setGuestUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function onSubmitUsername(e: FormEvent) {
    e.preventDefault()
    const matched = resolveGateRole(username)
    if (!matched) {
      setError('Hmm, not that one. Try again.')
      return
    }
    setRole(matched)
    setError('')
    setStep('password')
  }

  function onSubmitGuest(e: FormEvent) {
    e.preventDefault()
    const candidate = guestUsername.trim()
    if (!isValidGuestUsername(candidate)) {
      setError('Guest username must be at least 4 characters long.')
      return
    }
    setError('')
    onUnlock('guest', candidate)
  }

  function onSubmitPassword(e: FormEvent) {
    e.preventDefault()
    if (!role || !checkPasswordForRole(role, password)) {
      setError(
        role === 'him'
          ? 'Not quite — try your key again.'
          : 'Not quite — think of the day you said yes.',
      )
      return
    }
    setError('')
    onUnlock(role)
  }

  const passwordHint =
    role === 'him' ? gateAuth.him.passwordHint : gateAuth.her.passwordHint

  return (
    <div className="gate">
      <div className="gate__pattern" aria-hidden="true" />
      <div className="gate__card">
        <p className="gate__eyebrow">Private garden</p>
        <h1 className="gate__title">{site.nickname}</h1>
        <p className="gate__lead">
          {step === 'username'
            ? 'Knock first — enter your username.'
            : step === 'guest'
              ? 'Pick a guest username.'
              : role === 'him'
                ? 'Your key, gardener.'
                : 'One more key: the day you said yes.'}
        </p>

        {step === 'username' ? (
          <>
            <form className="gate__form" onSubmit={onSubmitUsername}>
              <label className="gate__label" htmlFor="gate-username">
                Username
              </label>
              <input
                id="gate-username"
                className="gate__input"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder={gateAuth.usernameHint}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (error) setError('')
                }}
              />
              {error ? <p className="gate__error">{error}</p> : null}
              <button type="submit" className="btn btn--gold gate__submit">
                Continue
              </button>
            </form>
            <div className="gate__guest">
              <p className="gate__guest-label">Just visiting?</p>
              <button
                type="button"
                className="btn btn--ghost gate__guest-btn"
                onClick={() => {
                  setGuestUsername('')
                  setError('')
                  setStep('guest')
                }}
              >
                Enter as guest
              </button>
            </div>
          </>
        ) : step === 'guest' ? (
          <form className="gate__form" onSubmit={onSubmitGuest}>
            <label className="gate__label" htmlFor="gate-guest-username">
              Guest username
            </label>
            <input
              id="gate-guest-username"
              className="gate__input"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="At least 4 characters"
              value={guestUsername}
              onChange={(e) => {
                setGuestUsername(e.target.value)
                if (error) setError('')
              }}
            />
            <p className="gate__hint">Choose a guest name of at least 4 characters.</p>
            {error ? <p className="gate__error">{error}</p> : null}
            <div className="gate__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setStep('username')
                  setGuestUsername('')
                  setError('')
                }}
              >
                Back
              </button>
              <button type="submit" className="btn btn--gold gate__submit">
                Enter as guest
              </button>
            </div>
          </form>
        ) : (
          <form className="gate__form" onSubmit={onSubmitPassword}>
            <label className="gate__label" htmlFor="gate-password">
              Password
            </label>
            <input
              id="gate-password"
              className="gate__input"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder={passwordHint}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
            />
            <p className="gate__hint">{passwordHint}</p>
            {error ? <p className="gate__error">{error}</p> : null}
            <div className="gate__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setStep('username')
                  setRole(null)
                  setPassword('')
                  setError('')
                }}
              >
                Back
              </button>
              <button type="submit" className="btn btn--gold gate__submit">
                Open the garden
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
