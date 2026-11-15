import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { forwardRef, useId, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-[18px] w-[18px] shrink-0 rounded-[5px] border border-input bg-card transition-colors hover:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      {props.checked === 'indeterminate' ? <Minus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden /> : <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

/** Checkbox with its label; the whole row is the click target (40px tall). */
export function CheckboxField({ label, className, id, ...props }: Omit<ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'children'> & { label: ReactNode }) {
  const auto = useId()
  const inputId = id ?? auto
  return (
    <div className={cn('flex min-h-10 items-center gap-2.5', className)}>
      <Checkbox id={inputId} {...props} />
      <label htmlFor={inputId} className={cn('cursor-pointer select-none text-sm leading-5', props.disabled && 'cursor-not-allowed opacity-60')}>{label}</label>
    </div>
  )
}
