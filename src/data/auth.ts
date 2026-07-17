/**
 * Gate credentials — edit before sharing the site.
 * Hers: username + the day she said yes.
 * Yours: username + your own password (plain string).
 */
export const gateAuth = {
  her: {
    username: 'antangoy',
    yesDay: {
      month: 7,
      day: 18,
      year: 2026,
    },
    passwordHint: 'The day you said yes · MM/DD/YYYY',
  },
  him: {
    username: 'vonvon',
    password: '01112002',
    passwordHint: 'Your key to the garden',
  },
  usernameHint: 'Your username',
  session: {
    /** `local` keeps you signed in across visits; `session` clears when the tab closes */
    persistence: 'local' as 'local' | 'session',
    /** Auto sign-out after N days; `null` = never */
    maxAgeDays: null as number | null,
  },
} as const

export type GateRole = 'her' | 'him'

export function usernameForRole(role: GateRole): string {
  return role === 'her' ? gateAuth.her.username : gateAuth.him.username
}

/** Former him usernames — remap so old “by …” labels stay current. */
const LEGACY_HIM_USERNAMES = ['mydeadromance'] as const

export function canonicalizeUsername(name: string): string {
  const normalized = name.trim().toLowerCase()
  if (
    LEGACY_HIM_USERNAMES.includes(
      normalized as (typeof LEGACY_HIM_USERNAMES)[number],
    )
  ) {
    return gateAuth.him.username
  }
  if (normalized === gateAuth.her.username.toLowerCase()) {
    return gateAuth.her.username
  }
  if (normalized === gateAuth.him.username.toLowerCase()) {
    return gateAuth.him.username
  }
  return name
}
