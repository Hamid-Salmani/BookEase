import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BookingDialog, PageHeader } from './shared'
import { ErrorState, Spinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/form'
import { useBusiness } from '@/hooks/queries'
import { api } from '@/lib/api'
import { fmtTime, parseYmd, todayInTz, ymd } from '@/lib/time'
import type { Booking, Calendar, Paged, Staff } from '@/lib/types'
import { cn } from '@/lib/utils'

const START_HOUR = 7
const END_HOUR = 21
const HOUR_PX = 56
const palette = ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#e87ba4']

export default function CalendarPage() {
  const { data: business } = useBusiness()
  const tz = business?.timeZoneId ?? 'UTC'
  const [view, setView] = useState<'day' | 'week'>('week')
  const [date, setDate] = useState<string>()
  const [staffId, setStaffId] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const current = date ?? (business ? todayInTz(tz) : undefined)
  const staff = useQuery({ queryKey: ['admin', 'staff-all'], queryFn: () => api<Paged<Staff>>('/admin/staff', { query: { pageSize: 100 } }), retry: false })
  const query = useQuery({
    queryKey: ['admin', 'calendar', current, view, staffId],
    enabled: !!current,
    queryFn: () => api<Calendar>('/admin/bookings/calendar', { query: { date: current, view, staffId } }),
  })
  const staffColors = useMemo(() => new Map((staff.data?.items ?? []).map((s, i) => [s.id, palette[i % palette.length]])), [staff.data])
  const shift = (n: number) => current && setDate(ymd(addDays(parseYmd(current), n * (view === 'week' ? 7 : 1))))

  const first = query.data ? format(parseYmd(query.data.fromUtc ? new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(query.data.fromUtc)) : current!), 'yyyy-MM-dd') : current
  const days = first ? Array.from({ length: view === 'week' ? 7 : 1 }, (_, i) => ymd(addDays(parseYmd(first), i))) : []
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <>
      <PageHeader title="Calendar" description={`Times in ${tz.replace('_', ' ')}`} actions={
        <>
          <Select aria-label="Filter by specialist" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-44">
            <option value="">All specialists</option>
            {staff.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="View">
            {(['day', 'week'] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium capitalize', view === v && 'bg-card shadow-sm')}>{v}</button>)}
          </div>
        </>
      } />
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setDate(undefined)}>Today</Button>
        <Button variant="outline" size="icon" aria-label="Next" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        <span className="ml-2 text-sm font-medium">{days.length > 0 && (view === 'week' ? `${format(parseYmd(days[0]), 'MMM d')} - ${format(parseYmd(days[6]), 'MMM d, yyyy')}` : format(parseYmd(days[0]), 'EEEE, MMM d, yyyy'))}</span>
      </div>
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <Spinner />}
      {query.data && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
            <div />
            {days.map((d) => <div key={d} className={cn('border-l px-2 py-2 text-center text-xs font-semibold', d === todayInTz(tz) && 'text-primary')}>{format(parseYmd(d), 'EEE d')}</div>)}
            <div className="relative" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h) => <div key={h} className="absolute right-2 -translate-y-2 text-[11px] text-muted-foreground" style={{ top: (h - START_HOUR) * HOUR_PX }}>{format(new Date(2000, 0, 1, h), 'h a')}</div>)}
            </div>
            {days.map((d) => {
              const dayStart = fromZonedTime(`${d}T00:00:00`, tz).getTime()
              const dayEnd = fromZonedTime(`${ymd(addDays(parseYmd(d), 1))}T00:00:00`, tz).getTime()
              const minutes = (iso: number) => (iso - dayStart) / 60000
              const dayBookings = query.data.bookings.filter((b) => new Date(b.startUtc).getTime() >= dayStart && new Date(b.startUtc).getTime() < dayEnd)
              const staffInDay = [...new Set(dayBookings.map((b) => b.staffId))]
              return (
                <div key={d} className="relative border-l" style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: (h - START_HOUR) * HOUR_PX }} />)}
                  {query.data.timeOff.map((t) => {
                    const s = Math.max(new Date(t.startUtc).getTime(), dayStart), e = Math.min(new Date(t.endUtc).getTime(), dayEnd)
                    if (e <= s) return null
                    return <div key={t.id} title={`${t.staffName}: ${t.reason ?? 'Time off'}`} className="absolute inset-x-0.5 overflow-hidden rounded bg-muted/80 px-1 text-[10px] text-muted-foreground" style={{ top: Math.max(0, (minutes(s) / 60 - START_HOUR) * HOUR_PX), height: Math.max(16, ((e - s) / 3_600_000) * HOUR_PX), backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.05) 6px 12px)' }}>{t.staffName} off</div>
                  })}
                  {dayBookings.map((b) => {
                    const idx = staffInDay.indexOf(b.staffId)
                    const top = (minutes(new Date(b.startUtc).getTime()) / 60 - START_HOUR) * HOUR_PX
                    const height = ((new Date(b.endUtc).getTime() - new Date(b.startUtc).getTime()) / 3_600_000) * HOUR_PX
                    const color = staffColors.get(b.staffId) ?? palette[0]
                    return (
                      <button key={b.id} onClick={() => setSelected(b)} aria-label={`${b.serviceName} for ${b.customerName} at ${fmtTime(b.startUtc, tz)}`}
                        className={cn('absolute overflow-hidden rounded-md border-l-4 bg-card px-1.5 py-0.5 text-left text-[11px] leading-tight shadow ring-1 ring-border transition-transform hover:z-10 hover:scale-[1.02]', b.status === 'Pending' && 'opacity-70', (b.status === 'Completed' || b.status === 'NoShow') && 'opacity-60')}
                        style={{ top: Math.max(0, top), height: Math.max(20, height - 2), left: `${(idx / staffInDay.length) * 100}%`, width: `calc(${100 / staffInDay.length}% - 3px)`, borderLeftColor: color }}>
                        <span className="block truncate font-semibold">{fmtTime(b.startUtc, tz)} {b.customerName}</span>
                        <span className="block truncate text-muted-foreground">{b.serviceName}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legend">
        {staff.data?.items.map((s) => <li key={s.id} className="flex items-center gap-1.5"><span className="h-3 w-1 rounded" style={{ background: staffColors.get(s.id) }} aria-hidden />{s.name}</li>)}
      </ul>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>{selected && <BookingDialog booking={selected} tz={tz} onClose={() => setSelected(null)} />}</Dialog>
    </>
  )
}
