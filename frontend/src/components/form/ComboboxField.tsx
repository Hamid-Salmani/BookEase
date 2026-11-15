import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Option } from './SelectField'

export interface ComboOption extends Option { description?: string }

const triggerClass = 'flex h-10 w-full items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-left text-sm transition-colors hover:border-foreground/50 data-[state=open]:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive'

/** Substring match on label and description; cmdk's default fuzzy match is too loose for names. */
const matches = (_value: string, search: string, keywords?: string[]) => (keywords ?? []).join(' ').toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0

interface BaseProps {
  options: ComboOption[]
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
}

interface SingleProps extends BaseProps {
  value: string
  onValueChange: (value: string) => void
  /** Adds a first item that clears the value (e.g. "All services"). */
  emptyLabel?: string
  clearable?: boolean
}

export function ComboboxField({ value, onValueChange, options, id, placeholder = 'Select...', searchPlaceholder = 'Search...', emptyText = 'No matches.', emptyLabel, clearable, disabled, invalid, className, 'aria-label': ariaLabel }: SingleProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const canClear = clearable && emptyLabel === undefined && value !== '' && !disabled
  const pick = (v: string) => { onValueChange(v); setOpen(false) }
  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" id={id} role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel} aria-invalid={invalid || undefined} disabled={disabled} className={cn(triggerClass, canClear && 'pr-16')}>
            <span className={cn('truncate', !selected && emptyLabel === undefined && 'text-muted-foreground')}>{selected?.label ?? (emptyLabel ?? placeholder)}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[14rem] p-0">
          <Command filter={matches}>
            <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {emptyLabel !== undefined && (
                  <CommandItem value="__all__" keywords={[emptyLabel]} onSelect={() => pick('')}>
                    <Check className={cn('h-4 w-4 text-primary', value === '' ? 'opacity-100' : 'opacity-0')} aria-hidden />{emptyLabel}
                  </CommandItem>
                )}
                {options.map((o) => (
                  <CommandItem key={o.value} value={o.value} keywords={[o.label, o.description ?? '']} disabled={o.disabled} onSelect={() => pick(o.value)}>
                    <Check className={cn('h-4 w-4 shrink-0 text-primary', o.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.description && <span className="block truncate text-xs text-muted-foreground">{o.description}</span>}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {canClear && (
        <button type="button" onClick={() => onValueChange('')} aria-label="Clear selection" className="absolute right-8 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-inner text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

interface MultiProps extends BaseProps {
  values: string[]
  onValuesChange: (values: string[]) => void
}

export function MultiComboboxField({ values, onValuesChange, options, id, placeholder = 'Select...', searchPlaceholder = 'Search...', emptyText = 'No matches.', disabled, invalid, className, 'aria-label': ariaLabel }: MultiProps) {
  const [open, setOpen] = useState(false)
  const chosen = options.filter((o) => values.includes(o.value))
  const toggle = (v: string) => onValuesChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" id={id} role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel} aria-invalid={invalid || undefined} disabled={disabled} className={triggerClass}>
            <span className={cn('truncate', values.length === 0 && 'text-muted-foreground')}>{values.length === 0 ? placeholder : `${values.length} selected`}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[14rem] p-0">
          <Command filter={matches}>
            <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
            <CommandList aria-multiselectable="true">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const on = values.includes(o.value)
                  return (
                    <CommandItem key={o.value} value={o.value} keywords={[o.label, o.description ?? '']} disabled={o.disabled} onSelect={() => toggle(o.value)}>
                      <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')} aria-hidden>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.description && <span className="block truncate text-xs text-muted-foreground">{o.description}</span>}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected">
          {chosen.map((o) => (
            <li key={o.value} className="inline-flex h-8 items-center gap-1 rounded-control bg-accent pl-2.5 pr-1 text-xs font-medium text-accent-foreground">
              {o.label}
              <button type="button" onClick={() => toggle(o.value)} disabled={disabled} aria-label={`Remove ${o.label}`} className="flex h-6 w-6 items-center justify-center rounded-inner hover:bg-foreground/10">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
