import { format } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseYmd, todayInTz, ymd } from '@/lib/time'
import { cn } from '@/lib/utils'

interface Props {
  /** A calendar date as yyyy-MM-dd, or '' for none. */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  /** Earliest / latest selectable day, yyyy-MM-dd. */
  min?: string
  max?: string
  /** Business time zone; decides which day is highlighted as "today". */
  tz?: string
  clearable?: boolean
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
}

export const formatDay = (value: string) => format(parseYmd(value), 'MMM d, yyyy')

export function DatePicker({ value, onChange, id, placeholder = 'Pick a date', min, max, tz, clearable = true, disabled, invalid, className, 'aria-label': ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseYmd(value) : undefined
  const today = tz ? parseYmd(todayInTz(tz)) : undefined
  const canClear = clearable && value !== '' && !disabled
  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-control border border-input bg-card px-3 text-left text-sm tabular-nums transition-colors hover:border-foreground/50 data-[state=open]:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive',
              canClear && 'pr-10',
              !selected && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{selected ? formatDay(value) : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            required={!clearable}
            selected={selected}
            defaultMonth={selected ?? today}
            today={today}
            fromDate={min ? parseYmd(min) : undefined}
            toDate={max ? parseYmd(max) : undefined}
            onSelect={(d) => { if (d) { onChange(ymd(d)); setOpen(false) } else if (clearable) { onChange(''); setOpen(false) } }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {canClear && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear date" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-inner text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
