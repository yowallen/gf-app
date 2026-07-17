import { gateAuth, type GateRole } from '../data/auth'

const SESSION_KEY = 'antangoy-gate-session'
const LEGACY_UNLOCK_KEY = 'antangoy-gate'
const LEGACY_ACTOR_KEY = 'antangoy-gate-actor'

export type GateSession = {
  role: GateRole
  username: string
  unlockedAt: number
}

export type GateActor = {
  role: GateRole
  username: string
}

function storageFor(persistence: typeof gateAuth.session.persistence): Storage {
  return persistence === 'session' ? sessionStorage : localStorage
}

function isGateRole(value: unknown): value is GateRole {
  return value === 'her' || value === 'him'
}

function parseSession(raw: string): GateSession | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'role' in parsed &&
      'username' in parsed &&
      'unlockedAt' in parsed &&
      isGateRole(parsed.role) &&
      typeof parsed.username === 'string' &&
      typeof parsed.unlockedAt === 'number'
    ) {
      return {
        role: parsed.role,
        username: parsed.username,
        unlockedAt: parsed.unlockedAt,
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function isExpired(session: GateSession): boolean {
  const { maxAgeDays } = gateAuth.session
  if (maxAgeDays === null) return false
  const maxAgeMs = maxAgeDays * 86_400_000
  return Date.now() - session.unlockedAt > maxAgeMs
}

function readLegacySession(): GateSession | null {
  try {
    if (localStorage.getItem(LEGACY_UNLOCK_KEY) !== 'unlocked') return null
    const raw = localStorage.getItem(LEGACY_ACTOR_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'role' in parsed &&
      'username' in parsed &&
      isGateRole(parsed.role) &&
      typeof parsed.username === 'string'
    ) {
      return {
        role: parsed.role,
        username: parsed.username,
        unlockedAt: Date.now(),
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function clearLegacyKeys(): void {
  try {
    localStorage.removeItem(LEGACY_UNLOCK_KEY)
    localStorage.removeItem(LEGACY_ACTOR_KEY)
  } catch {
    /* ignore */
  }
}

function clearAllStorages(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    clearLegacyKeys()
  } catch {
    /* ignore */
  }
}

export function readGateSession(): GateSession | null {
  const { persistence } = gateAuth.session
  const primary = storageFor(persistence)

  try {
    const raw = primary.getItem(SESSION_KEY)
    if (raw) {
      const session = parseSession(raw)
      if (session && !isExpired(session)) return session
      primary.removeItem(SESSION_KEY)
    }
  } catch {
    /* ignore */
  }

  const legacy = readLegacySession()
  if (!legacy || isExpired(legacy)) {
    clearAllStorages()
    return null
  }

  writeGateSession(legacy)
  return legacy
}

export function writeGateSession(session: GateSession): void {
  const payload = JSON.stringify(session)
  const primary = storageFor(gateAuth.session.persistence)

  try {
    primary.setItem(SESSION_KEY, payload)
    if (gateAuth.session.persistence === 'local') {
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
    clearLegacyKeys()
  } catch {
    /* ignore */
  }
}

export function clearGateSession(): void {
  clearAllStorages()
}

export function toGateActor(session: GateSession): GateActor {
  return { role: session.role, username: session.username }
}
