import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { useMemo } from 'react'
import { SelectField } from './SelectField'

const label = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return format(new Date(2000, 0, 1, h, m), 'h:mm a')
}

interface Props {
  /** HH:mm (24 hour), or '' for none. */
  value: string
  onChange: (value: string) => void
  stepMinutes?: number
  id?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
}

export function TimeSelect({ value, onChange, stepMinutes = 15, ...rest }: Props) {
  const options = useMemo(() => {
    const list: string[] = []
    for (let m = 0; m < 24 * 60; m += stepMinutes) list.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    // A stored time that is off the grid (e.g. 09:10) must stay selectable.
    if (value && !list.includes(value)) list.push(value)
    return list.sort().map((v) => ({ value: v, label: label(v) }))
  }, [stepMinutes, value])
  return <SelectField value={value} onValueChange={onChange} options={options} placeholder="Time" icon={<Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />} {...rest} />
}
