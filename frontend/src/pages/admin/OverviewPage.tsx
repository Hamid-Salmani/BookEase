import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BookingDialog, PageHeader, StatCard } from './shared'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IllustrationCalendar } from '@/components/illustrations'
import { EmptyState, ErrorState, StatSkeleton } from '@/components/states'
import { useBusiness } from '@/hooks/queries'
import { api } from '@/lib/api'
import { fmtDateTime, money } from '@/lib/time'
import type { Booking, Overview } from '@/lib/types'
import { usePageTitle } from '@/lib/usePageTitle'

export default function OverviewPage() {
  usePageTitle('Overview')
  const { data: business } = useBusiness()
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api<Overview>('/admin/overview') })
  const [selected, setSelected] = useState<Booking | null>(null)
  const tz = business?.timeZoneId ?? 'UTC'
  const o = query.data
  return (
    <>
      <PageHeader title="Overview" description="How the business is doing right now." />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {query.isLoading && [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)}
        {o && (
          <>
            <StatCard label="Today" value={o.todayBookings} hint="appointments" />
            <StatCard label="Next 7 days" value={o.upcomingBookings} hint={`${o.pendingBookings} awaiting payment`} />
            <StatCard label="Revenue this month" value={money(o.revenueThisMonthCents, o.currency)} hint={`${o.completedThisMonth} completed`} />
            <StatCard label="New customers" value={o.newCustomersThisMonth} hint={`No-show rate ${(o.noShowRate * 100).toFixed(1)}% (30 days)`} />
          </>
        )}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Next appointments</CardTitle></CardHeader>
        <CardContent>
          {o && o.nextBookings.length === 0 && <EmptyState illustration={<IllustrationCalendar />} title="A clear stretch ahead" description="No upcoming appointments yet. New bookings show up here as they come in." className="py-8" />}
          <ul className="divide-y">
            {o?.nextBookings.map((b) => (
              <li key={b.id}>
                <button className="flex w-full items-center justify-between gap-3 rounded-control px-2 py-3 text-left transition-colors hover:bg-muted/60" onClick={() => setSelected(b)}>
                  <span><span className="block font-medium">{b.serviceName} <span className="font-normal text-muted-foreground">for {b.customerName}</span></span><span className="text-sm tabular-nums text-muted-foreground">{fmtDateTime(b.startUtc, tz)} &middot; {b.staffName}</span></span>
                  <StatusBadge status={b.status} />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>{selected && <BookingDialog booking={selected} tz={tz} onClose={() => setSelected(null)} />}</Dialog>
    </>
  )
}
