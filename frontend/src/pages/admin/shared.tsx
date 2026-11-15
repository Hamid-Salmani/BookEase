import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { CheckboxField } from '@/components/ui/checkbox'
import { DialogContent } from '@/components/ui/dialog'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtDateTime, money } from '@/lib/time'
import type { Booking } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-h1">{title}</h1>{description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Bordered table frame. The body scrolls and header cells (see Th) stay pinned. */
export function TableCard({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border bg-card">
      <div className="max-h-[calc(100vh-21rem)] min-h-40 overflow-auto">{children}</div>
      {footer}
    </div>
  )
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm">
      <span className="tabular-nums text-muted-foreground">{total} result{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-[5rem] text-center tabular-nums text-muted-foreground">Page {page} / {Math.max(totalPages, 1)}</span>
        <Button variant="outline" size="icon" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export const Th = ({ children, sort, current, desc, onSort, align = 'left' }: { children: ReactNode; sort?: string; current?: string; desc?: boolean; onSort?: (s: string) => void; align?: 'left' | 'right' }) => {
  const active = sort !== undefined && current === sort
  const Icon = !active ? ChevronsUpDown : desc ? ArrowDown : ArrowUp
  return (
    <th
      scope="col"
      className={cn('sticky top-0 z-10 whitespace-nowrap bg-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]', align === 'right' ? 'text-right' : 'text-left')}
      aria-sort={active ? (desc ? 'descending' : 'ascending') : undefined}
    >
      {sort && onSort ? (
        <button type="button" className={cn('inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground', align === 'right' && 'flex-row-reverse')} onClick={() => onSort(sort)}>
          {children}<Icon className={cn('h-3.5 w-3.5', !active && 'opacity-40')} aria-hidden />
        </button>
      ) : children}
    </th>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-card border bg-card p-5 animate-fade-up">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-stat tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function BookingDialog({ booking, tz, onClose }: { booking: Booking; tz: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [refund, setRefund] = useState(true)
  const started = new Date(booking.startUtc) <= new Date()
  const run = useMutation({
    mutationFn: (action: 'confirm' | 'complete' | 'no-show' | 'cancel') =>
      api<Booking>(`/admin/bookings/${booking.id}/${action}`, { method: 'POST', body: action === 'cancel' ? { reason: 'Cancelled by staff', refund } : undefined }),
    onSuccess: () => {
      toast.success('Booking updated')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      onClose()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'The booking was not updated. Check your connection and try again.'),
  })
  const canCancel = booking.status === 'Pending' || booking.status === 'Confirmed'
  return (
    <DialogContent title={booking.serviceName} description={`Reference ${booking.reference}`}>
      <div className="mb-4 flex items-center gap-2"><StatusBadge status={booking.status} admin /></div>
      <dl className="divide-y rounded-control border text-sm">
        {[['Customer', `${booking.customerName} (${booking.customerEmail})`], ['Specialist', booking.staffName], ['When', fmtDateTime(booking.startUtc, tz)], ['Price', money(booking.priceCents, booking.currency)], ['Payment', booking.paymentStatus ?? 'None'], ['Notes', booking.notes ?? '-']].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        {booking.status === 'Pending' && <Button loading={run.isPending && run.variables === 'confirm'} onClick={() => run.mutate('confirm')}>Confirm</Button>}
        {booking.status === 'Confirmed' && started && <Button loading={run.isPending && run.variables === 'complete'} onClick={() => run.mutate('complete')}>Mark completed</Button>}
        {booking.status === 'Confirmed' && started && <Button variant="outline" onClick={() => run.mutate('no-show')}>No-show</Button>}
        {canCancel && <Button variant="destructive" onClick={() => run.mutate('cancel')}>Cancel booking</Button>}
      </div>
      {canCancel && booking.paymentStatus === 'Succeeded' && user && <div className="mt-3"><CheckboxField label="Refund the payment when cancelling" checked={refund} onCheckedChange={(v) => setRefund(v === true)} /></div>}
    </DialogContent>
  )
}
