import { useCallback, useEffect, useState } from 'react'
import type { GateRole } from '../data/auth'

export type ThemeId = 'green' | 'purple'

const STORAGE_PREFIX = 'antangoy-theme'
const LEGACY_STORAGE_KEY = 'antangoy-theme'

/** Him defaults to Bloom; her keeps Meadow. */
function defaultThemeForRole(role: GateRole): ThemeId {
  return role === 'him' ? 'purple' : 'green'
}

function storageKeyForRole(role: GateRole): string {
  return `${STORAGE_PREFIX}-${role}`
}

function isThemeId(value: string | null): value is ThemeId {
  return value === 'green' || value === 'purple'
}

function readStoredTheme(role: GateRole): ThemeId {
  try {
    const raw = localStorage.getItem(storageKeyForRole(role))
    if (isThemeId(raw)) return raw

    // Shared legacy key only seeds her — him always defaults to Bloom
    if (role === 'her') {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (isThemeId(legacy)) {
        localStorage.setItem(storageKeyForRole(role), legacy)
        return legacy
      }
    }
  } catch {
    /* ignore */
  }
  return defaultThemeForRole(role)
}

function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'purple' ? '#6b4f8a' : '#3d7a4a')
  }
}

export function useTheme(role: GateRole) {
  const [themes, setThemes] = useState<Record<GateRole, ThemeId>>(() => {
    const him = readStoredTheme('him')
    const her = readStoredTheme('her')
    const initial = role === 'him' ? him : her
    if (typeof document !== 'undefined') applyTheme(initial)
    return { him, her }
  })

  const theme = themes[role]

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(storageKeyForRole(role), theme)
    } catch {
      /* ignore */
    }
  }, [theme, role])

  const setTheme = useCallback(
    (next: ThemeId) => {
      setThemes((prev) => ({ ...prev, [role]: next }))
    },
    [role],
  )

  return { theme, setTheme }
}
