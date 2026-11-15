import type { AuthResponse } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api'
const REFRESH_KEY = 'bookease.refresh'

let accessToken: string | null = null
let refreshing: Promise<AuthResponse | null> | null = null
let onSessionChange: ((auth: AuthResponse | null) => void) | null = null

export const setSessionListener = (fn: (auth: AuthResponse | null) => void) => { onSessionChange = fn }
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_KEY)

export function storeSession(auth: AuthResponse | null) {
  accessToken = auth?.accessToken ?? null
  if (auth) localStorage.setItem(REFRESH_KEY, auth.refreshToken)
  else localStorage.removeItem(REFRESH_KEY)
  onSessionChange?.(auth)
}

export class ApiError extends Error {
  constructor(public status: number, public title: string, message: string, public fieldErrors: Record<string, string[]> = {}) {
    super(message)
  }
}

async function toApiError(res: Response) {
  try {
    const p = await res.json()
    return new ApiError(res.status, p.title ?? 'Error', p.detail ?? p.title ?? `Request failed (${res.status})`, p.errors ?? {})
  } catch {
    return new ApiError(res.status, 'Error', `Request failed (${res.status})`)
  }
}

export function refreshSession(): Promise<AuthResponse | null> {
  const token = getStoredRefreshToken()
  if (!token) return Promise.resolve(null)
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  })
    .then(async (res) => {
      if (!res.ok) { storeSession(null); return null }
      const auth = (await res.json()) as AuthResponse
      storeSession(auth)
      return auth
    })
    .catch(() => null)
    .finally(() => { refreshing = null })
  return refreshing
}

type Query = Record<string, string | number | boolean | null | undefined>

export async function api<T>(path: string, opts: { method?: string; body?: unknown; query?: Query; retry?: boolean } = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  Object.entries(opts.query ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)) })
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: { ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 401 && opts.retry !== false && getStoredRefreshToken()) {
    const renewed = await refreshSession()
    if (renewed) return api<T>(path, { ...opts, retry: false })
  }
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function download(path: string, query: Query, fallbackName: string) {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)) })
  const res = await fetch(url, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} })
  if (!res.ok) throw await toApiError(res)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName
  a.click()
  URL.revokeObjectURL(a.href)
}
