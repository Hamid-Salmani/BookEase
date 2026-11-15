import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getStoredRefreshToken, refreshSession, setSessionListener, storeSession } from './api'
import type { AuthResponse, User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(getStoredRefreshToken()))

  useEffect(() => {
    setSessionListener((auth) => setUser(auth?.user ?? null))
    if (!getStoredRefreshToken()) return
    refreshSession().finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const auth = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })
    storeSession(auth)
    return auth.user
  }, [])
  const register = useCallback(async (input: { email: string; password: string; fullName: string; phone?: string }) => {
    const auth = await api<AuthResponse>('/auth/register', { method: 'POST', body: input })
    storeSession(auth)
    return auth.user
  }, [])
  const logout = useCallback(async () => {
    const token = getStoredRefreshToken()
    if (token) await api('/auth/logout', { method: 'POST', body: { refreshToken: token }, retry: false }).catch(() => undefined)
    storeSession(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
