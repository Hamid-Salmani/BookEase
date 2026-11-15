import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { WEEK_STARTS_ON } from '@/lib/config'
import { cn } from '@/lib/utils'

export function Calendar({ className, classNames, showOutsideDays = false, weekStartsOn = WEEK_STARTS_ON, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row sm:gap-6',
        month: 'space-y-2',
        caption: 'relative flex h-10 items-center justify-center',
        caption_label: 'font-display text-base font-semibold tracking-tight',
        nav: 'flex items-center',
        nav_button: 'absolute flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        nav_button_previous: 'left-0',
        nav_button_next: 'right-0',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell: 'flex h-8 w-10 items-center justify-center text-xs font-medium text-muted-foreground',
        row: 'mt-1 flex w-full',
        cell: cn(
          'relative h-10 w-10 p-0 text-center text-sm focus-within:z-20',
          '[&:has([aria-selected].day_range_middle)]:bg-accent [&:has([aria-selected].day_range_start)]:rounded-l-control [&:has([aria-selected].day_range_end)]:rounded-r-control',
          '[&:has([aria-selected].day_range_start:not(.day_range_end))]:bg-gradient-to-r [&:has([aria-selected].day_range_start:not(.day_range_end))]:from-transparent [&:has([aria-selected].day_range_start:not(.day_range_end))]:from-50% [&:has([aria-selected].day_range_start:not(.day_range_end))]:to-accent [&:has([aria-selected].day_range_start:not(.day_range_end))]:to-50%',
          '[&:has([aria-selected].day_range_end:not(.day_range_start))]:bg-gradient-to-l [&:has([aria-selected].day_range_end:not(.day_range_start))]:from-transparent [&:has([aria-selected].day_range_end:not(.day_range_start))]:from-50% [&:has([aria-selected].day_range_end:not(.day_range_start))]:to-accent [&:has([aria-selected].day_range_end:not(.day_range_start))]:to-50%',
        ),
        day: 'flex h-10 w-10 items-center justify-center rounded-control p-0 font-normal tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100',
        day_range_start: 'day_range_start',
        day_range_end: 'day_range_end',
        day_range_middle: 'day_range_middle aria-selected:!bg-transparent aria-selected:text-accent-foreground',
        day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'font-semibold text-primary ring-1 ring-inset ring-primary/45',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-40 line-through decoration-muted-foreground/40 hover:bg-transparent',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" aria-hidden />,
        IconRight: () => <ChevronRight className="h-4 w-4" aria-hidden />,
      }}
      {...props}
    />
  )
}
