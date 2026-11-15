import * as SwitchPrimitive from '@radix-ui/react-switch'
import { forwardRef, useId, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Switch = forwardRef<ElementRef<typeof SwitchPrimitive.Root>, ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-[18px] w-[18px] translate-x-[3px] rounded-full bg-card transition-transform duration-150 data-[state=checked]:translate-x-[19px] data-[state=checked]:bg-primary-foreground" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export function SwitchField({ label, description, className, id, ...props }: Omit<ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, 'children'> & { label: ReactNode; description?: string }) {
  const auto = useId()
  const switchId = id ?? auto
  return (
    <div className={cn('flex min-h-10 items-center justify-between gap-4', className)}>
      <label htmlFor={switchId} className="cursor-pointer select-none text-sm">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </label>
      <Switch id={switchId} {...props} />
    </div>
  )
}
