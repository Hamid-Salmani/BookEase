import type { ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface Option { value: string; label: string; disabled?: boolean }

/** Radix Select cannot hold an empty-string item, so the "everything" choice is stored under this key. */
const ALL = '__all__'

interface Props {
  value: string
  onValueChange: (value: string) => void
  options: Option[]
  id?: string
  placeholder?: string
  /** Adds a first item that clears the value (e.g. "All statuses"); the empty string means "no filter". */
  emptyLabel?: string
  icon?: ReactNode
  disabled?: boolean
  className?: string
  invalid?: boolean
  'aria-label'?: string
}

export function SelectField({ value, onValueChange, options, id, placeholder = 'Select...', emptyLabel, icon, disabled, className, invalid, 'aria-label': ariaLabel }: Props) {
  const shown = emptyLabel !== undefined && value === '' ? ALL : value
  return (
    <Select value={shown} onValueChange={(v) => onValueChange(v === ALL ? '' : v)} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel} aria-invalid={invalid || undefined}>
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {emptyLabel !== undefined && <SelectItem value={ALL}>{emptyLabel}</SelectItem>}
        {options.map((o) => <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
