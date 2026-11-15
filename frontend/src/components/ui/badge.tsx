import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/lib/types'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/15 text-info',
  danger: 'bg-destructive/15 text-destructive',
}

export const Badge = ({ className, tone = 'neutral', ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) => (
  <span
    className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-inner px-2 py-0.5 text-xs font-medium before:h-1.5 before:w-1.5 before:rounded-full before:bg-current', tones[tone], className)}
    {...p}
  />
)

const statusTone: Record<BookingStatus, BadgeTone> = { Pending: 'warning', Confirmed: 'success', Cancelled: 'neutral', Completed: 'info', NoShow: 'danger' }
const labels: Record<BookingStatus, string> = { Pending: 'Awaiting payment', Confirmed: 'Confirmed', Cancelled: 'Cancelled', Completed: 'Completed', NoShow: 'No-show' }

export const StatusBadge = ({ status, admin }: { status: BookingStatus; admin?: boolean }) => (
  <Badge tone={statusTone[status]}>{admin && status === 'Pending' ? 'Pending' : labels[status]}</Badge>
)
