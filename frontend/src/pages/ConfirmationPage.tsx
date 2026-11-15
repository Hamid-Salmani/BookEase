import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, Check, Clock, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, Spinner } from '@/components/states'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useBusiness } from '@/hooks/queries'
import { usePageTitle } from '@/lib/usePageTitle'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { fmtDateTime, money } from '@/lib/time'
import type { Booking } from '@/lib/types'

function downloadIcs(b: Booking) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BookEase//EN', 'BEGIN:VEVENT', `UID:${b.id}@bookease`, `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.startUtc)}`, `DTEND:${stamp(b.endUtc)}`, `SUMMARY:${b.serviceName} with ${b.staffName}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `${b.reference}.ics`
  a.click()
  URL.revokeObjectURL(a.href)
}

function StatusIcon({ tone, children }: { tone: 'warning' | 'success' | 'muted'; children: ReactNode }) {
  return (
    <span className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-full', tone === 'warning' && 'bg-warning/15 text-warning', tone === 'success' && 'bg-success/15 text-success', tone === 'muted' && 'bg-muted text-muted-foreground')} aria-hidden>
      {children}
    </span>
  )
}

export default function ConfirmationPage() {
  usePageTitle('Your booking')
  const { id } = useParams()
  const { data: business } = useBusiness()
  const query = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api<Booking>(`/bookings/${id}`),
    refetchInterval: (q) => (q.state.data?.status === 'Pending' ? 2000 : false),
  })
  const tz = business?.timeZoneId ?? 'UTC'
  const b = query.data

  return (
    <div className="container flex justify-center py-12">
      <Card className="w-full max-w-lg animate-fade-up p-6 text-center sm:p-8">
        {query.isLoading && <Spinner />}
        {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
        {b?.status === 'Pending' && (
          <>
            <StatusIcon tone="warning"><Clock className="h-5 w-5 animate-pulse" /></StatusIcon>
            <h1 className="mt-4 text-h1">Confirming your payment</h1>
            <p className="mt-2 text-muted-foreground">Waiting for the bank to confirm. This page updates by itself, usually within a few seconds.</p>
          </>
        )}
        {b && (b.status === 'Confirmed' || b.status === 'Completed') && (
          <>
            <StatusIcon tone="success"><Check className="h-5 w-5" /></StatusIcon>
            <h1 className="mt-4 text-h1">You're booked</h1>
            <p className="mt-2 text-muted-foreground">A confirmation is on its way to your inbox.</p>
          </>
        )}
        {b && (b.status === 'Cancelled' || b.status === 'NoShow') && (
          <>
            <StatusIcon tone="muted"><X className="h-5 w-5" /></StatusIcon>
            <h1 className="mt-4 text-h1">This booking is no longer active</h1>
            <p className="mt-2 text-muted-foreground">{b.cancellationReason ?? 'It has been cancelled.'}</p>
          </>
        )}
        {b && (
          <>
            <dl className="mt-6 divide-y rounded-control border text-left text-sm">
              {[['Reference', b.reference], ['Service', b.serviceName], ['With', b.staffName], ['When', fmtDateTime(b.startUtc, tz)], ['Total', money(b.priceCents, b.currency)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {b.status === 'Confirmed' && <Button variant="outline" onClick={() => downloadIcs(b)}><CalendarPlus className="h-4 w-4" aria-hidden /> Add to calendar</Button>}
              <Button asChild><Link to="/my-bookings">My bookings</Link></Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
