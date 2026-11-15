import { addMonths, format } from 'date-fns'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useBusiness, useDaySlots, useMonthAvailability } from '@/hooks/queries'
import { fmtTime, parseYmd, todayInTz, ymd } from '@/lib/time'
import type { Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ErrorState, ListSkeleton } from './states'

interface Props {
  serviceId: string
  staffId: string | null
  value: Slot | null
  onChange: (slot: Slot) => void
}

export function SlotPicker({ serviceId, staffId, value, onChange }: Props) {
  const { data: business } = useBusiness()
  const tz = business?.timeZoneId ?? 'UTC'
  const [month, setMonth] = useState(() => new Date())
  const [date, setDate] = useState<Date | undefined>()
  const monthKey = format(month, 'yyyy-MM')
  const monthQuery = useMonthAvailability(serviceId, monthKey, staffId)
  const slotsQuery = useDaySlots(serviceId, date ? ymd(date) : undefined, staffId)
  const open = new Set(monthQuery.data?.days.filter((d) => d.hasSlots).map((d) => d.date))
  const today = parseYmd(todayInTz(tz))

  return (
    <div className="grid gap-6 md:grid-cols-[auto,1fr]">
      <div className="rounded-card border bg-card">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={month}
          onMonthChange={setMonth}
          today={today}
          fromMonth={today}
          toMonth={addMonths(today, 6)}
          disabled={(d) => d < today || (monthQuery.data ? !open.has(ymd(d)) && format(d, 'yyyy-MM') === monthKey : false)}
        />
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">Times shown in {tz.replace(/_/g, ' ')}</p>
      </div>
      <div aria-live="polite">
        {!date && <p className="rounded-card border border-dashed p-6 text-sm text-muted-foreground">Pick a day on the calendar and the open times will appear here.</p>}
        {date && slotsQuery.isLoading && <ListSkeleton rows={2} height="h-10" />}
        {date && slotsQuery.isError && <ErrorState error={slotsQuery.error} onRetry={() => slotsQuery.refetch()} />}
        {date && slotsQuery.data && (
          <>
            <h3 className="mb-3 font-display text-h3">{format(date, 'EEEE, MMMM d')}</h3>
            {slotsQuery.data.slots.length === 0 ? (
              <p className="rounded-card border border-dashed p-6 text-sm text-muted-foreground">Nothing left on this day. Try the next one with a free time.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slotsQuery.data.slots.map((s) => {
                  const selected = value?.startUtc === s.startUtc
                  return (
                    <li key={s.startUtc}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(s)}
                        className={cn('h-10 w-full rounded-control border px-2 text-sm font-medium tabular-nums transition-colors hover:border-primary hover:bg-accent', selected && 'border-primary bg-primary text-primary-foreground hover:bg-primary')}
                      >
                        {fmtTime(s.startUtc, tz)}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
