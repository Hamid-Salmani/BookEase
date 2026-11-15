import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/utils'

export const Command = forwardRef<ElementRef<typeof CommandPrimitive>, ComponentPropsWithoutRef<typeof CommandPrimitive>>(({ className, ...props }, ref) => (
  <CommandPrimitive ref={ref} className={cn('flex w-full flex-col overflow-hidden rounded-card bg-popover text-popover-foreground', className)} {...props} />
))
Command.displayName = 'Command'

export const CommandInput = forwardRef<ElementRef<typeof CommandPrimitive.Input>, ComponentPropsWithoutRef<typeof CommandPrimitive.Input>>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b px-3" cmdk-input-wrapper="">
    <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <CommandPrimitive.Input
      ref={ref}
      className={cn('flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50', className)}
      {...props}
    />
  </div>
))
CommandInput.displayName = 'CommandInput'

export const CommandList = forwardRef<ElementRef<typeof CommandPrimitive.List>, ComponentPropsWithoutRef<typeof CommandPrimitive.List>>(({ className, ...props }, ref) => (
  <CommandPrimitive.List ref={ref} className={cn('max-h-[min(18rem,50vh)] overflow-y-auto overflow-x-hidden p-1', className)} {...props} />
))
CommandList.displayName = 'CommandList'

export const CommandEmpty = forwardRef<ElementRef<typeof CommandPrimitive.Empty>, ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="px-3 py-6 text-center text-sm text-muted-foreground" {...props} />
))
CommandEmpty.displayName = 'CommandEmpty'

export const CommandGroup = CommandPrimitive.Group

export const CommandItem = forwardRef<ElementRef<typeof CommandPrimitive.Item>, ComponentPropsWithoutRef<typeof CommandPrimitive.Item>>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-inner px-2 py-1.5 text-sm outline-none sm:min-h-9',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
      className,
    )}
    {...props}
  />
))
CommandItem.displayName = 'CommandItem'
