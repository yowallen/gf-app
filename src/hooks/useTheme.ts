import { useCallback, useEffect, useState } from 'react'

export type ThemeId = 'green' | 'purple'

const STORAGE_KEY = 'antangoy-theme'

function isThemeId(value: string | null): value is ThemeId {
  return value === 'green' || value === 'purple'
}

function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'green'
}

function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'purple' ? '#6b4f8a' : '#3d7a4a')
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof document === 'undefined') return 'green'
    const initial = readStoredTheme()
    applyTheme(initial)
    return initial
  })

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
