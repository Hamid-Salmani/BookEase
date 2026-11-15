import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { Spinner } from './states'

export function RequireRole({ children, roles, fallback = '/' }: { children: ReactNode; roles?: Role[]; fallback?: string }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={fallback} replace />
  return <>{children}</>
}
