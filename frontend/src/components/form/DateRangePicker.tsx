import { addDays, endOfMonth, format, startOfMonth, subDays } from 'date-fns'
import { CalendarRange, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { parseYmd, todayInTz, ymd } from '@/lib/time'
import { cn } from '@/lib/utils'

export interface YmdRange { from: string; to: string }

type PresetKey = 'today' | 'next7' | 'month' | 'last30'
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'next7', label: 'Next 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'last30', label: 'Last 30 days' },
]

function presetRange(key: PresetKey, today: Date): YmdRange {
  switch (key) {
    case 'today': return { from: ymd(today), to: ymd(today) }
    case 'next7': return { from: ymd(today), to: ymd(addDays(today, 6)) }
    case 'month': return { from: ymd(startOfMonth(today)), to: ymd(endOfMonth(today)) }
    case 'last30': return { from: ymd(subDays(today, 29)), to: ymd(today) }
  }
}

export function formatRange({ from, to }: YmdRange) {
  if (!from && !to) return ''
  if (from && !to) return `From ${format(parseYmd(from), 'MMM d, yyyy')}`
  if (!from && to) return `Until ${format(parseYmd(to), 'MMM d, yyyy')}`
  const a = parseYmd(from), b = parseYmd(to)
  if (from === to) return format(a, 'MMM d, yyyy')
  return a.getFullYear() === b.getFullYear() ? `${format(a, 'MMM d')} – ${format(b, 'MMM d, yyyy')}` : `${format(a, 'MMM d, yyyy')} – ${format(b, 'MMM d, yyyy')}`
}

interface Props {
  value: YmdRange
  onChange: (value: YmdRange) => void
  /** Business time zone: "today" and the presets are computed in it. */
  tz: string
  id?: string
  placeholder?: string
  /** Shows a clear button; leave off where a range is always required. */
  clearable?: boolean
  className?: string
  'aria-label'?: string
}

export function DateRangePicker({ value, onChange, tz, id, placeholder = 'Any date', clearable = true, className, 'aria-label': ariaLabel = 'Date range' }: Props) {
  const [open, setOpen] = useState(false)
  const wide = useMediaQuery('(min-width: 768px)')
  const today = useMemo(() => parseYmd(todayInTz(tz)), [tz])
  const hasValue = Boolean(value.from && value.to)
  const activePreset = hasValue ? PRESETS.find((p) => { const r = presetRange(p.key, today); return r.from === value.from && r.to === value.to })?.key : undefined
  const [draft, setDraft] = useState<DateRange | undefined>()
  const [custom, setCustom] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(hasValue ? { from: parseYmd(value.from), to: parseYmd(value.to) } : undefined)
    setCustom(hasValue && !activePreset)
    // Re-seed only when the popover opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const commit = (r: YmdRange) => { onChange(r); setOpen(false) }
  const onDayClick = (day: Date) => {
    if (!draft?.from || draft.to) { setDraft({ from: day, to: undefined }); return }
    const [from, to] = day < draft.from ? [day, draft.from] : [draft.from, day]
    setDraft({ from, to })
    commit({ from: ymd(from), to: ymd(to) })
  }

  const label = activePreset ? PRESETS.find((p) => p.key === activePreset)!.label : formatRange(value)
  const canClear = clearable && (value.from !== '' || value.to !== '')
  const month = draft?.from ?? (hasValue ? parseYmd(value.from) : today)

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-control border border-input bg-card px-3 text-left text-sm tabular-nums transition-colors hover:border-foreground/50 data-[state=open]:border-primary',
              canClear && 'pr-10',
              !label && 'text-muted-foreground',
            )}
          >
            <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{label || placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="flex flex-col md:flex-row">
            <div className="flex gap-1 overflow-x-auto border-b p-2 md:w-40 md:flex-col md:overflow-visible md:border-b-0 md:border-r" role="group" aria-label="Quick ranges">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => commit(presetRange(p.key, today))}
                  aria-pressed={activePreset === p.key}
                  className={cn('h-10 shrink-0 rounded-inner px-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground md:h-9', activePreset === p.key && 'bg-accent font-medium text-accent-foreground')}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setCustom(true); setDraft(undefined) }}
                aria-pressed={custom}
                className={cn('h-10 shrink-0 rounded-inner px-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground md:h-9', custom && 'bg-accent font-medium text-accent-foreground')}
              >
                Custom
              </button>
            </div>
            <div>
              <Calendar
                mode="range"
                selected={draft}
                onDayClick={onDayClick}
                defaultMonth={month}
                today={today}
                numberOfMonths={wide ? 2 : 1}
                initialFocus
              />
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground" aria-live="polite">
                {draft?.from && !draft.to ? 'Now pick the last day.' : hasValue ? formatRange(value) : 'Pick the first day, then the last.'}
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {canClear && (
        <button type="button" onClick={() => onChange({ from: '', to: '' })} aria-label="Clear date range" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-inner text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
