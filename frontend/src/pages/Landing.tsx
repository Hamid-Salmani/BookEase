import { CalendarClock, CreditCard, MailCheck, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ServiceCard } from '@/components/ServiceCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/card'
import { useBusiness, useServices } from '@/hooks/queries'

const steps = [
  { icon: CalendarClock, title: 'Pick a time', text: 'Browse live availability and choose the slot that suits you.' },
  { icon: CreditCard, title: 'Pay securely', text: 'Your slot is held for 10 minutes while you pay online.' },
  { icon: MailCheck, title: 'Get confirmed', text: 'Instant email confirmation and a reminder the day before.' },
  { icon: ShieldCheck, title: 'Change freely', text: 'Cancel or reschedule for free up to 24 hours before.' },
]

export default function Landing() {
  const { data: business } = useBusiness()
  const services = useServices()
  return (
    <>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/70 to-background">
        <div className="container grid gap-10 py-16 md:grid-cols-[1.2fr,1fr] md:py-24">
          <div className="animate-fade-up">
            <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary">Online booking, 24/7</span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              {business?.name ?? 'Book your next appointment'}<span className="text-primary">.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{business?.description ?? 'Choose a service, pick a time that works for you and pay online in under a minute.'}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link to="/book">Book an appointment</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/services">View services</Link></Button>
            </div>
          </div>
          <ul className="grid gap-3 self-center">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-xl border bg-card/80 p-4 shadow-sm animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><s.icon className="h-5 w-5" aria-hidden /></span>
                <div><h2 className="text-sm font-semibold">{s.title}</h2><p className="text-sm text-muted-foreground">{s.text}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="container py-16">
        <div className="mb-8 flex items-end justify-between">
          <div><h2 className="text-2xl font-bold tracking-tight">Popular services</h2><p className="text-muted-foreground">Transparent prices, no surprises.</p></div>
          <Button variant="ghost" asChild><Link to="/services">See all</Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}
          {services.data?.slice(0, 3).map((s) => <ServiceCard key={s.id} service={s} currency={business?.currency ?? 'usd'} />)}
        </div>
      </section>
    </>
  )
}
