import { AlertCircle, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { Skeleton } from './ui/card'
import { IllustrationList } from './illustrations'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

export function EmptyState({ title, description, action, illustration, className }: { title: string; description?: string; action?: ReactNode; illustration?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-12 text-center animate-fade-up', className)}>
      {illustration ?? <IllustrationList />}
      <h3 className="mt-4 font-display text-h3">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = "This didn't load" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof ApiError ? error.message : 'The server did not answer. Check your connection and try again.'
  return (
    <div role="alert" className="flex items-start gap-3 rounded-card border border-destructive/40 bg-destructive/5 p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
        {onRetry && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  )
}

export const Spinner = ({ label = 'Loading' }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}...
  </div>
)

export const ListSkeleton = ({ rows = 3, height = 'h-24' }: { rows?: number; height?: string }) => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className={`${height} w-full`} />)}
  </div>
)

/** Mirrors the admin tables: header strip, then rows with a few cells of varied width. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  const widths = ['w-32', 'w-40', 'w-24', 'w-28', 'w-16', 'w-20']
  return (
    <div className="overflow-hidden rounded-card border bg-card" role="status" aria-label="Loading">
      <div className="flex gap-6 border-b bg-muted/40 px-4 py-3">{Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-3 w-16" />)}</div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 border-b px-4 py-3.5 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className={cn('h-4', widths[(r + c) % widths.length])} />)}
        </div>
      ))}
    </div>
  )
}

export const ServiceCardSkeleton = () => (
  <div className="overflow-hidden rounded-card border bg-card" role="status" aria-label="Loading">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="space-y-3 p-4">
      <div className="flex justify-between gap-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-14" /></div>
      <Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-2/3" />
      <div className="flex items-center justify-between pt-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-9 w-16" /></div>
    </div>
  </div>
)

export const StatSkeleton = () => (
  <div className="rounded-card border bg-card p-5" role="status" aria-label="Loading"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-28" /><Skeleton className="mt-3 h-3 w-20" /></div>
)

export const BookingCardSkeleton = () => (
  <div className="rounded-card border bg-card p-5" role="status" aria-label="Loading">
    <div className="flex justify-between gap-4"><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3.5 w-24" /></div><Skeleton className="h-6 w-24" /></div>
    <div className="mt-4 flex gap-6"><Skeleton className="h-4 w-44" /><Skeleton className="h-4 w-14" /></div>
  </div>
)
