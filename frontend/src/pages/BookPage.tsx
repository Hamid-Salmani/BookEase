import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, UserRound, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as Tabs from '@radix-ui/react-tabs'
import { PaymentStep } from '@/components/PaymentStep'
import { SlotPicker } from '@/components/SlotPicker'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/form'
import { useBusiness, usePublicConfig, useServices, useStaff } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { duration, fmtDateTime, money } from '@/lib/time'
import type { CreateBookingResponse, Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LoginForm, RegisterForm } from './AuthPages'

const STEPS = ['Service', 'Specialist', 'Date & time', 'Details', 'Payment']

function useCountdown(iso?: string | null) {
  const [left, setLeft] = useState(() => (iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 0))
  useEffect(() => {
    if (!iso) return
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [iso])
  return left
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2 overflow-x-auto" aria-label="Booking progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors', i < step ? 'bg-primary text-primary-foreground' : i === step ? 'border-2 border-primary text-primary' : 'border text-muted-foreground')}>
            {i < step ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
          </span>
          <span className={cn('hidden text-sm sm:inline', i === step ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-border sm:w-10" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

export default function BookPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: business } = useBusiness()
  const { data: config } = usePublicConfig()
  const services = useServices()
  const [serviceId, setServiceId] = useState<string | null>(params.get('service'))
  const [staffId, setStaffId] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState(params.get('service') ? 1 : 0)
  const [created, setCreated] = useState<CreateBookingResponse | null>(null)
  const staff = useStaff(serviceId ?? undefined)
  const service = services.data?.find((s) => s.id === serviceId)
  const tz = business?.timeZoneId ?? 'UTC'
  const currency = business?.currency ?? 'usd'
  const secondsLeft = useCountdown(created?.booking.expiresAtUtc)
  const staffName = staffId ? staff.data?.find((s) => s.id === staffId)?.name : 'Any available specialist'

  const create = useMutation({
    mutationFn: () => api<CreateBookingResponse>('/bookings', { method: 'POST', body: { serviceId, staffId, startUtc: slot!.startUtc, notes: notes || undefined } }),
    onSuccess: (r) => {
      if (!r.payment) navigate(`/booking/confirmation/${r.booking.id}`)
      else { setCreated(r); setStep(4) }
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        toast.error('Sorry, that time was just taken. Please pick another.')
        setSlot(null)
        setStep(2)
        queryClient.invalidateQueries({ queryKey: ['slots'] })
        queryClient.invalidateQueries({ queryKey: ['month'] })
      } else toast.error(e instanceof ApiError ? e.message : 'Could not create the booking')
    },
  })

  const summary = useMemo(() => (
    <Card className="p-5 lg:sticky lg:top-24">
      <h2 className="text-sm font-semibold text-muted-foreground">Your booking</h2>
      <dl className="mt-3 space-y-3 text-sm">
        <div><dt className="text-muted-foreground">Service</dt><dd className="font-medium">{service?.name ?? '-'}</dd></div>
        <div><dt className="text-muted-foreground">With</dt><dd className="font-medium">{service ? staffName ?? '-' : '-'}</dd></div>
        <div><dt className="text-muted-foreground">When</dt><dd className="font-medium">{slot ? fmtDateTime(slot.startUtc, tz) : '-'}</dd></div>
        {service && <div className="flex items-center justify-between border-t pt-3"><dt className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" aria-hidden />{duration(service.durationMinutes)}</dt><dd className="text-base font-semibold">{money(service.priceCents, currency)}</dd></div>}
      </dl>
    </Card>
  ), [service, staffName, slot, tz, currency])

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Book an appointment</h1>
      <p className="mb-8 mt-1 text-muted-foreground">It only takes a minute.</p>
      <Stepper step={step} />
      <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
        <div className="animate-fade-up" key={step}>
          {step === 0 && (
            <section aria-labelledby="s0">
              <h2 id="s0" className="mb-4 text-lg font-semibold">Choose a service</h2>
              {services.isLoading && <ListSkeleton />}
              {services.isError && <ErrorState error={services.error} onRetry={() => services.refetch()} />}
              {services.data?.length === 0 && <EmptyState title="No services available" />}
              <div className="grid gap-3 sm:grid-cols-2">
                {services.data?.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setServiceId(s.id); setStaffId(null); setSlot(null); setStep(1) }}
                    className={cn('rounded-xl border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm', serviceId === s.id && 'border-primary ring-1 ring-primary')}>
                    <div className="flex justify-between gap-2"><span className="font-semibold">{s.name}</span><span className="font-semibold text-primary">{money(s.priceCents, currency)}</span></div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{duration(s.durationMinutes)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && serviceId && (
            <section aria-labelledby="s1">
              <h2 id="s1" className="mb-4 text-lg font-semibold">Choose a specialist</h2>
              {staff.isLoading && <ListSkeleton rows={3} height="h-16" />}
              {staff.isError && <ErrorState error={staff.error} onRetry={() => staff.refetch()} />}
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setStaffId(null); setSlot(null); setStep(2) }} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground"><Users className="h-5 w-5" aria-hidden /></span>
                  <span><span className="block font-semibold">Any available</span><span className="text-sm text-muted-foreground">Maximum availability</span></span>
                </button>
                {staff.data?.map((m) => (
                  <button key={m.id} type="button" onClick={() => { setStaffId(m.id); setSlot(null); setStep(2) }} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground">{m.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                    <span><span className="block font-semibold">{m.name}</span><span className="text-sm text-muted-foreground">{m.title}</span></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && serviceId && (
            <section aria-labelledby="s2">
              <h2 id="s2" className="mb-4 text-lg font-semibold">Pick a date and time</h2>
              <SlotPicker serviceId={serviceId} staffId={staffId} value={slot} onChange={setSlot} />
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={goBack}>Back</Button>
                <Button disabled={!slot} onClick={() => setStep(3)}>Continue</Button>
              </div>
            </section>
          )}

          {step === 3 && service && slot && (
            <section aria-labelledby="s3" className="space-y-5">
              <h2 id="s3" className="text-lg font-semibold">Your details</h2>
              {!user ? (
                <Card className="p-5">
                  <Tabs.Root defaultValue="register">
                    <Tabs.List className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Account">
                      {[['register', 'New customer'], ['login', 'I have an account']].map(([v, l]) => (
                        <Tabs.Trigger key={v} value={v} className="rounded-md px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm">{l}</Tabs.Trigger>
                      ))}
                    </Tabs.List>
                    <Tabs.Content value="register"><RegisterForm onDone={() => undefined} /></Tabs.Content>
                    <Tabs.Content value="login"><LoginForm onDone={() => undefined} /></Tabs.Content>
                  </Tabs.Root>
                </Card>
              ) : (
                <Card className="space-y-4 p-5">
                  <p className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4 text-primary" aria-hidden />Booking as <strong>{user.fullName}</strong> ({user.email})</p>
                  <Field label="Notes for your appointment (optional)" htmlFor="notes">
                    <Textarea id="notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" />
                  </Field>
                  <p className="text-xs text-muted-foreground">Free cancellation and rescheduling until {business?.cancellationWindowHours ?? 24} hours before your appointment.</p>
                </Card>
              )}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={goBack}>Back</Button>
                <Button disabled={!user} loading={create.isPending} onClick={() => create.mutate()}>{service.priceCents > 0 ? 'Continue to payment' : 'Confirm booking'}</Button>
              </div>
            </section>
          )}

          {step === 4 && created?.payment && (
            <section aria-labelledby="s4" className="space-y-4">
              <h2 id="s4" className="text-lg font-semibold">Payment</h2>
              {secondsLeft > 0 ? (
                <>
                  <p role="timer" className="rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground">
                    Your slot is held for <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong>
                  </p>
                  <Card className="p-5">
                    <PaymentStep bookingId={created.booking.id} payment={created.payment} publishableKey={config?.stripePublishableKey} demo={config?.demoPayments ?? false}
                      onPaid={() => navigate(`/booking/confirmation/${created.booking.id}`)} />
                  </Card>
                </>
              ) : (
                <EmptyState title="Your hold has expired" description="The time slot was released. Please choose a time again." action={<Button onClick={() => { setCreated(null); setSlot(null); setStep(2) }}>Pick another time</Button>} />
              )}
            </section>
          )}
        </div>
        {step > 0 && <aside aria-label="Booking summary">{summary}</aside>}
      </div>
    </div>
  )
}
