import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

/** A bottom drawer for small screens. */
export function SheetContent({ title, description, children, footer, className }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-card border-t bg-card shadow-pop outline-none duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div>
            <DialogPrimitive.Title className="font-display text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', !description && 'sr-only')}>{description ?? title}</DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close className="-mr-2 flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex gap-2 border-t p-4">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
