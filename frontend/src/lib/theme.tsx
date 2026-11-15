import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'bookease.theme'
const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

const resolve = (pref: ThemePreference): ResolvedTheme => (pref === 'system' ? (query().matches ? 'dark' : 'light') : pref)

function apply(theme: ResolvedTheme, animate: boolean) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 200)
  }
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme)
}

interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (pref: ThemePreference) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readPreference()))

  const setPreference = useCallback((pref: ThemePreference) => {
    try {
      if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, pref)
    } catch { /* storage can be blocked; the choice still applies for this visit */ }
    const next = resolve(pref)
    apply(next, true)
    setPreferenceState(pref)
    setResolved(next)
  }, [])

  useEffect(() => {
    if (preference !== 'system') return
    const mq = query()
    const onChange = () => { const next = resolve('system'); apply(next, true); setResolved(next) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const pref = readPreference()
      const next = resolve(pref)
      apply(next, true)
      setPreferenceState(pref)
      setResolved(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

/** Reads a design token (an "H S% L%" triplet) and returns it as a #rrggbb string, for libraries that cannot read CSS variables. */
export function tokenToHex(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  const [h, s, l] = raw.replace(/%/g, '').split(/\s+/).map(Number)
  if ([h, s, l].some(Number.isNaN)) return '#000000'
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}
