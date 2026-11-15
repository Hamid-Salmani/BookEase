import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ServiceGrid } from '@/components/ServiceGrid'
import { WeekStrip } from '@/components/illustrations'
import { ServiceCardSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useBusiness, useServices } from '@/hooks/queries'
import { cityOf } from '@/lib/services'
import { usePageTitle } from '@/lib/usePageTitle'

const HOLD_MINUTES = 10
const FEATURED = 6

export default function Landing() {
  const { data: business } = useBusiness()
  const services = useServices()
  usePageTitle(undefined, business?.description ?? undefined)
  const hours = business?.cancellationWindowHours ?? 24
  const city = business ? cityOf(business.timeZoneId) : null
  const steps = [
    { title: 'Choose a service', text: 'See the price and length up front, then pick who you would like to see or take the first free specialist.' },
    { title: 'Pick a time', text: `Availability is live${city ? `, shown in ${city} time` : ''}. Days with nothing left are greyed out.` },
    { title: 'Pay to hold it', text: `For paid services your slot is held for ${HOLD_MINUTES} minutes while you pay. If the clock runs out, it goes back on the calendar.` },
    { title: 'Change of plans?', text: `Cancel or reschedule free until ${hours} hours before. After that the payment stays with us.` },
  ]
  const facts = [
    { value: services.data ? String(services.data.length) : '-', label: services.data?.length === 1 ? 'service' : 'services' },
    { value: `${hours}h`, label: 'free changes' },
    { value: `${HOLD_MINUTES} min`, label: 'slot hold' },
  ]
  const featured = services.data?.slice(0, FEATURED) ?? []

  return (
    <>
      <section className="border-b">
        <div className="container grid items-center gap-x-12 gap-y-10 py-12 md:py-20 lg:grid-cols-12">
          <div className="animate-fade-up lg:col-span-7">
            {city && <p className="flex items-center gap-3 text-sm font-medium text-muted-foreground"><span className="h-px w-8 bg-primary" aria-hidden />Now booking in {city}</p>}
            <h1 className="mt-4 text-balance text-display">{business?.name ?? 'Book your next appointment'}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{business?.description ?? 'Pick a service, choose a time that suits you and you are booked.'}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link to="/book">Book an appointment</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/services">See all services</Link></Button>
            </div>
            <dl className="mt-10 flex max-w-md divide-x border-y">
              {facts.map((f) => (
                <div key={f.label} className="flex-1 px-4 py-3 first:pl-0">
                  <dd className="font-display text-2xl font-medium tabular-nums tracking-tight">{f.value}</dd>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <figure className="lg:col-span-5">
            <WeekStrip />
            <figcaption className="mt-3 text-sm text-muted-foreground">Open slots stay dashed. Pick one and it is yours for {HOLD_MINUTES} minutes.</figcaption>
          </figure>
        </div>
      </section>

      <section className="container py-14" aria-labelledby="how">
        <h2 id="how" className="text-h2">How booking works</h2>
        <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t pt-4">
              <span className="font-display text-sm font-medium tabular-nums text-primary">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 text-h3">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t bg-muted/40 py-14" aria-labelledby="menu">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="menu" className="text-h2">What we offer</h2><p className="mt-1 text-muted-foreground">Everything bookable right now, with live prices.</p></div>
            <Button variant="ghost" asChild><Link to="/services">All services <ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
          </div>
          {services.isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <ServiceCardSkeleton key={i} />)}</div>}
          {services.data && <ServiceGrid services={featured} currency={business?.currency ?? 'usd'} />}
        </div>
      </section>

      {business?.contactEmail && (
        <section className="container py-12">
          <p className="max-w-xl text-lg">Not sure which service fits? Write to <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${business.contactEmail}`}>{business.contactEmail}</a> and we will point you the right way.</p>
        </section>
      )}
    </>
  )
}
