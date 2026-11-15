import { SlidersHorizontal, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'

export interface ActiveFilter { key: string; label: string; value: string; onRemove: () => void }

interface Props {
  /** The always-visible search field. */
  search?: ReactNode
  /** Filter controls. Give each a responsive width such as `w-full lg:w-44`. */
  children: ReactNode
  active: ActiveFilter[]
  onClearAll: () => void
  className?: string
}

/** One compact row on desktop; search plus a "Filters" drawer on small screens. Active filters show as removable chips. */
export function FilterBar({ search, children, active, onClearAll, className }: Props) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('mb-4 space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search && <div className="min-w-0 flex-1 lg:min-w-[12rem] lg:max-w-xs">{search}</div>}
        {desktop ? children : (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
                {active.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs tabular-nums text-primary-foreground">{active.length}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent
              title="Filters"
              description="Narrow the list. Changes apply straight away."
              footer={
                <>
                  <Button variant="outline" className="flex-1" disabled={active.length === 0} onClick={onClearAll}>Clear all</Button>
                  <SheetClose asChild><Button className="flex-1">Done</Button></SheetClose>
                </>
              }
            >
              {children}
            </SheetContent>
          </Sheet>
        )}
      </div>
      {active.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {active.map((f) => (
            <li key={f.key} className="inline-flex h-8 items-center gap-1 rounded-control bg-accent pl-2.5 pr-1 text-xs text-accent-foreground">
              <span className="text-accent-foreground/70">{f.label}:</span> <span className="font-medium">{f.value}</span>
              <button type="button" onClick={f.onRemove} aria-label={`Remove ${f.label} filter`} className="flex h-6 w-6 items-center justify-center rounded-inner hover:bg-foreground/10">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
          <li><Button variant="ghost" size="sm" onClick={onClearAll}>Clear all</Button></li>
        </ul>
      )}
    </div>
  )
}
