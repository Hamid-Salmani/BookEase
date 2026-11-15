import { ServiceCard } from '@/components/ServiceCard'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useBusiness, useServices } from '@/hooks/queries'

export default function ServicesPage() {
  const { data: business } = useBusiness()
  const services = useServices()
  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight">Our services</h1>
      <p className="mt-2 text-muted-foreground">Choose a service to see live availability.</p>
      <div className="mt-8">
        {services.isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <ListSkeleton key={i} rows={1} height="h-44" />)}</div>}
        {services.isError && <ErrorState error={services.error} onRetry={() => services.refetch()} />}
        {services.data?.length === 0 && <EmptyState title="No services yet" description="Please check back soon." />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.data?.map((s) => <ServiceCard key={s.id} service={s} currency={business?.currency ?? 'usd'} />)}
        </div>
      </div>
    </div>
  )
}
