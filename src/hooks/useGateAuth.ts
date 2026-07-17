import { useCallback, useState } from 'react'
import { gateAuth, type GateRole } from '../data/auth'
import {
  clearGateSession,
  readGateSession,
  toGateActor,
  writeGateSession,
  type GateActor,
} from '../lib/gateSession'

export type { GateActor } from '../lib/gateSession'

export type GateStep = 'username' | 'password'

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePassword(value: string): string {
  return value.trim()
}

/** Pull month/day/year from common date spellings. */
export function parseYesDayInput(raw: string): {
  month: number
  day: number
  year: number
} | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const slashOrDash = trimmed.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/,
  )
  if (slashOrDash) {
    const month = Number(slashOrDash[1])
    const day = Number(slashOrDash[2])
    const year = Number(slashOrDash[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day, year }
    }
  }

  const iso = trimmed.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day, year }
    }
  }

  return null
}

export function resolveGateRole(input: string): GateRole | null {
  const name = normalizeUsername(input)
  if (name === normalizeUsername(gateAuth.her.username)) return 'her'
  if (name === normalizeUsername(gateAuth.him.username)) return 'him'
  return null
}

export function usernameForRole(role: GateRole): string {
  return role === 'her' ? gateAuth.her.username : gateAuth.him.username
}

export function checkPasswordForRole(role: GateRole, input: string): boolean {
  if (role === 'her') {
    const parsed = parseYesDayInput(input)
    if (!parsed) return false
    return (
      parsed.month === gateAuth.her.yesDay.month &&
      parsed.day === gateAuth.her.yesDay.day &&
      parsed.year === gateAuth.her.yesDay.year
    )
  }

  return (
    normalizePassword(input).toLowerCase() ===
    normalizePassword(gateAuth.him.password).toLowerCase()
  )
}

function readInitialState(): { unlocked: boolean; actor: GateActor | null } {
  const session = readGateSession()
  if (!session) return { unlocked: false, actor: null }
  return { unlocked: true, actor: toGateActor(session) }
}

export function useGateAuth() {
  const [state, setState] = useState(readInitialState)

  const unlock = useCallback((role: GateRole) => {
    const session = {
      role,
      username: usernameForRole(role),
      unlockedAt: Date.now(),
    }
    writeGateSession(session)
    setState({ unlocked: true, actor: toGateActor(session) })
  }, [])

  const signOut = useCallback(() => {
    clearGateSession()
    setState({ unlocked: false, actor: null })
  }, [])

  return {
    unlocked: state.unlocked,
    actor: state.actor,
    unlock,
    signOut,
  }
}
