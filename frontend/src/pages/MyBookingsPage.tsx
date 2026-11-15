import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarX2, Clock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as Tabs from '@radix-ui/react-tabs'
import { SlotPicker } from '@/components/SlotPicker'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/form'
import { useBusiness } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { fmtDateTime, money } from '@/lib/time'
import type { Booking, CancellationQuote, Paged, Slot } from '@/lib/types'

function CancelDialog({ booking, tz, onClose }: { booking: Booking; tz: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const quote = useQuery({ queryKey: ['quote', booking.id], queryFn: () => api<CancellationQuote>(`/bookings/${booking.id}/cancellation-quote`) })
  const cancel = useMutation({
    mutationFn: () => api(`/bookings/${booking.id}/cancel`, { method: 'POST', body: { reason: reason || null } }),
    onSuccess: () => { toast.success('Booking cancelled'); queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); onClose() },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not cancel'),
  })
  return (
    <DialogContent title="Cancel this booking?" description={`${booking.serviceName} on ${fmtDateTime(booking.startUtc, tz)}`}>
      {quote.isLoading && <ListSkeleton rows={1} height="h-12" />}
      {quote.data && (
        <p className={`rounded-lg p-3 text-sm ${quote.data.withinFreeWindow ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
          {quote.data.withinFreeWindow
            ? quote.data.refundCents > 0 ? `Free cancellation. ${money(quote.data.refundCents, booking.currency)} will be refunded to your card.` : 'Free cancellation.'
            : `Free cancellation ended ${fmtDateTime(quote.data.freeUntilUtc, tz)}. This payment will not be refunded.`}
        </p>
      )}
      <div className="mt-4"><Field label="Reason (optional)" htmlFor="reason"><Textarea id="reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Keep booking</Button>
        <Button variant="destructive" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel booking</Button>
      </div>
    </DialogContent>
  )
}

function RescheduleDialog({ booking, tz, onClose }: { booking: Booking; tz: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [slot, setSlot] = useState<Slot | null>(null)
  const move = useMutation({
    mutationFn: () => api(`/bookings/${booking.id}/reschedule`, { method: 'POST', body: { startUtc: slot!.startUtc, staffId: slot!.staffIds.includes(booking.staffId) ? booking.staffId : slot!.staffIds[0] } }),
    onSuccess: () => { toast.success('Booking rescheduled'); queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); queryClient.invalidateQueries({ queryKey: ['slots'] }); onClose() },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not reschedule'),
  })
  return (
    <DialogContent className="max-w-3xl" title="Reschedule" description={`Currently ${fmtDateTime(booking.startUtc, tz)}`}>
      <SlotPicker serviceId={booking.serviceId} staffId={null} value={slot} onChange={setSlot} />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button disabled={!slot} loading={move.isPending} onClick={() => move.mutate()}>Confirm new time</Button>
      </div>
    </DialogContent>
  )
}

function BookingCard({ b, tz, freeHours }: { b: Booking; tz: string; freeHours: number }) {
  const [dialog, setDialog] = useState<'cancel' | 'reschedule' | null>(null)
  const active = (b.status === 'Confirmed' || b.status === 'Pending') && new Date(b.startUtc) > new Date()
  const canReschedule = active && new Date(b.startUtc).getTime() - Date.now() > freeHours * 3_600_000
  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{b.serviceName}</h3>
          <p className="text-sm text-muted-foreground">with {b.staffName}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" aria-hidden />{fmtDateTime(b.startUtc, tz)}</span>
        <span className="font-medium">{money(b.priceCents, b.currency)}</span>
        <span className="text-xs text-muted-foreground">Ref {b.reference}</span>
      </div>
      {b.paymentStatus === 'Refunded' && <p className="mt-2 text-xs text-muted-foreground">Refunded {money(b.refundedCents, b.currency)}</p>}
      {active && (
        <div className="mt-4 flex gap-2">
          {canReschedule && <Button variant="outline" size="sm" onClick={() => setDialog('reschedule')}>Reschedule</Button>}
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDialog('cancel')}>Cancel</Button>
        </div>
      )}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog === 'cancel' && <CancelDialog booking={b} tz={tz} onClose={() => setDialog(null)} />}
        {dialog === 'reschedule' && <RescheduleDialog booking={b} tz={tz} onClose={() => setDialog(null)} />}
      </Dialog>
    </Card>
  )
}

function BookingList({ upcoming }: { upcoming: boolean }) {
  const { data: business } = useBusiness()
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['my-bookings', upcoming, page],
    queryFn: () => api<Paged<Booking>>('/bookings/mine', { query: { upcoming, page, pageSize: 10, desc: !upcoming } }),
  })
  if (query.isLoading) return <ListSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!query.data || query.data.items.length === 0)
    return <EmptyState icon={<CalendarX2 className="h-5 w-5" />} title={upcoming ? 'No upcoming bookings' : 'No past bookings'} description={upcoming ? 'Ready when you are.' : undefined} action={upcoming ? <Button asChild><Link to="/book">Book now</Link></Button> : undefined} />
  return (
    <div className="space-y-3">
      {query.data.items.map((b) => <BookingCard key={b.id} b={b} tz={business?.timeZoneId ?? 'UTC'} freeHours={business?.cancellationWindowHours ?? 24} />)}
      {query.data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {query.data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

export default function MyBookingsPage() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>
        <Button asChild><Link to="/book">New booking</Link></Button>
      </div>
      <Tabs.Root defaultValue="upcoming">
        <Tabs.List className="mb-5 inline-flex rounded-lg bg-muted p-1" aria-label="Booking filter">
          {[['upcoming', 'Upcoming'], ['past', 'Past & cancelled']].map(([v, l]) => (
            <Tabs.Trigger key={v} value={v} className="rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm">{l}</Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="upcoming"><BookingList upcoming /></Tabs.Content>
        <Tabs.Content value="past"><BookingList upcoming={false} /></Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
