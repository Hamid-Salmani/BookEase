import { ServiceGrid } from '@/components/ServiceGrid'
import { IllustrationList } from '@/components/illustrations'
import { EmptyState, ErrorState, ServiceCardSkeleton } from '@/components/states'
import { useBusiness, useServices } from '@/hooks/queries'
import { usePageTitle } from '@/lib/usePageTitle'

export default function ServicesPage() {
  const { data: business } = useBusiness()
  const services = useServices()
  usePageTitle('Services', 'Every service with its price and length. Pick one to see live availability.')
  return (
    <div className="container py-12">
      <h1 className="text-h1">Services</h1>
      <p className="mt-2 text-muted-foreground">Each one lists its price and length. Pick one to see live availability.</p>
      <div className="mt-8">
        {services.isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <ServiceCardSkeleton key={i} />)}</div>}
        {services.isError && <ErrorState error={services.error} onRetry={() => services.refetch()} title="Services didn't load" />}
        {services.data?.length === 0 && (
          <EmptyState
            illustration={<IllustrationList />}
            title="The menu is still being written"
            description={business?.contactEmail ? `Nothing is bookable yet. Write to ${business.contactEmail} and we will help you directly.` : 'Nothing is bookable yet. Check back soon.'}
          />
        )}
        {services.data && services.data.length > 0 && <ServiceGrid services={services.data} currency={business?.currency ?? 'usd'} />}
      </div>
    </div>
  )
}
