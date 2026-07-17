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
