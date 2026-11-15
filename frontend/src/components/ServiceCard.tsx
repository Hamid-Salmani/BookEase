import { Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { duration, money } from '@/lib/time'
import type { Service } from '@/lib/types'

export function ServiceCard({ service, currency }: { service: Service; currency: string }) {
  return (
    <Card className="group flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{service.name}</h3>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-accent-foreground">{money(service.priceCents, currency)}</span>
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{service.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" aria-hidden />{duration(service.durationMinutes)}</span>
        <Button size="sm" asChild><Link to={`/book?service=${service.id}`} aria-label={`Book ${service.name}`}>Book</Link></Button>
      </div>
    </Card>
  )
}
