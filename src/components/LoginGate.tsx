import { useState, type FormEvent } from 'react'
import { gateAuth, type GateRole } from '../data/auth'
import { site } from '../data/site'
import {
  checkPasswordForRole,
  resolveGateRole,
  type GateStep,
} from '../hooks/useGateAuth'

type LoginGateProps = {
  onUnlock: (role: GateRole) => void
}

export function LoginGate({ onUnlock }: LoginGateProps) {
  const [step, setStep] = useState<GateStep>('username')
  const [role, setRole] = useState<GateRole | null>(null)
  const [username, setUsername] = useState('')
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
            : role === 'him'
              ? 'Your key, gardener.'
              : 'One more key: the day you said yes.'}
        </p>

        {step === 'username' ? (
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
