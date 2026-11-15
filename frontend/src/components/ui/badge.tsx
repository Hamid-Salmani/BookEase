import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/lib/types'

export const Badge = ({ className, ...p }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', className)} {...p} />
)

const styles: Record<BookingStatus, string> = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-800',
  Confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelled: 'border-stone-200 bg-stone-100 text-stone-600',
  Completed: 'border-sky-200 bg-sky-50 text-sky-800',
  NoShow: 'border-rose-200 bg-rose-50 text-rose-800',
}
const labels: Record<BookingStatus, string> = { Pending: 'Awaiting payment', Confirmed: 'Confirmed', Cancelled: 'Cancelled', Completed: 'Completed', NoShow: 'No-show' }

export const StatusBadge = ({ status, admin }: { status: BookingStatus; admin?: boolean }) => (
  <Badge className={styles[status]}>{admin && status === 'Pending' ? 'Pending' : labels[status]}</Badge>
)
