import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/form'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  'aria-label': string
}

export function SearchInput({ value, onChange, placeholder, className, 'aria-label': ariaLabel }: Props) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden" placeholder={placeholder} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-inner text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
