import { ServiceCard } from '@/components/ServiceCard'
import { groupServices } from '@/lib/services'
import type { Service } from '@/lib/types'

/** Service cards, under a category heading when the services carry categories. */
export function ServiceGrid({ services, currency }: { services: Service[]; currency: string }) {
  const groups = groupServices(services)
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.category ?? 'all'} aria-label={g.category ?? undefined}>
          {g.category && <h2 className="mb-4 flex items-center gap-3 font-display text-h3 text-muted-foreground">{g.category}<span className="h-px flex-1 bg-border" aria-hidden /></h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((s) => <ServiceCard key={s.id} service={s} currency={currency} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
