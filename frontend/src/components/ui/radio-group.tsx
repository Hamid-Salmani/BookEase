import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { forwardRef, useId, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const RadioGroup = forwardRef<ElementRef<typeof RadioGroupPrimitive.Root>, ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-1', className)} {...props} />
))
RadioGroup.displayName = 'RadioGroup'

export const RadioGroupItem = forwardRef<ElementRef<typeof RadioGroupPrimitive.Item>, ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors hover:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="h-2 w-2 rounded-full bg-primary" />
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = 'RadioGroupItem'

export function RadioField({ label, value, ...props }: Omit<ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>, 'children'> & { label: ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-h-10 items-center gap-2.5">
      <RadioGroupItem id={id} value={value} {...props} />
      <label htmlFor={id} className="cursor-pointer select-none text-sm">{label}</label>
    </div>
  )
}

/** A segmented toggle (one choice of a few) built on radio semantics. */
export function SegmentedControl<T extends string>({ value, onValueChange, options, label, className }: { value: T; onValueChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
  return (
    <RadioGroupPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)} aria-label={label} orientation="horizontal" className={cn('inline-flex h-10 items-center gap-0.5 rounded-control bg-muted p-1', className)}>
      {options.map((o) => (
        <RadioGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className="h-8 rounded-inner px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-[0_0_0_1px_hsl(var(--border))]"
        >
          {o.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
