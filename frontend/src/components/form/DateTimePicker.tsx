import { cn } from '@/lib/utils'
import { DatePicker } from './DatePicker'
import { TimeSelect } from './TimeSelect'

interface Props {
  /** yyyy-MM-ddTHH:mm in the business time zone, same shape a datetime-local input used. */
  value: string
  onChange: (value: string) => void
  tz?: string
  id?: string
  invalid?: boolean
  className?: string
  min?: string
  'aria-label'?: string
}

export function DateTimePicker({ value, onChange, tz, id, invalid, className, min, 'aria-label': ariaLabel = 'Date and time' }: Props) {
  const [date = '', time = ''] = value.split('T')
  return (
    <div className={cn('grid grid-cols-[1fr,8.5rem] gap-2', className)} role="group" aria-label={ariaLabel}>
      <DatePicker id={id} value={date} tz={tz} clearable={false} min={min} invalid={invalid} aria-label={`${ariaLabel}: date`} onChange={(d) => onChange(`${d}T${time || '09:00'}`)} />
      <TimeSelect value={time} invalid={invalid} aria-label={`${ariaLabel}: time`} onChange={(t) => onChange(`${date}T${t}`)} />
    </div>
  )
}
