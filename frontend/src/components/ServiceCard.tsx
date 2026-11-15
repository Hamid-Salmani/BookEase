import { Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { duration, money } from '@/lib/time'
import type { Service } from '@/lib/types'
import { ServiceImage } from './ServiceImage'

export function ServiceCard({ service, currency }: { service: Service; currency: string }) {
  return (
    <Card className="group flex flex-col overflow-hidden transition-colors duration-150 hover:border-primary/50">
      <ServiceImage service={service} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">{service.name}</h3>
          <span className="shrink-0 font-medium tabular-nums text-primary">{money(service.priceCents, currency)}</span>
        </div>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-muted-foreground">{service.description}</p>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground"><Clock className="h-4 w-4" aria-hidden />{duration(service.durationMinutes)}</span>
          <Button size="sm" asChild><Link to={`/book?service=${service.id}`} aria-label={`Book ${service.name}`}>Book</Link></Button>
        </div>
      </div>
    </Card>
  )
}
