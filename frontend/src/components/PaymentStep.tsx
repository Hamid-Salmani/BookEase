import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { money } from '@/lib/time'
import type { PaymentIntentInfo } from '@/lib/types'

const stripeCache = new Map<string, Promise<Stripe | null>>()
const getStripe = (key: string) => {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key))
  return stripeCache.get(key)!
}

function StripeForm({ bookingId, amount, currency, onPaid }: { bookingId: string; amount: number; currency: string; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!stripe || !elements) return
        setBusy(true)
        setError(undefined)
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: `${window.location.origin}/booking/confirmation/${bookingId}` },
          redirect: 'if_required',
        })
        setBusy(false)
        if (result.error) setError(result.error.message ?? 'Payment failed')
        else onPaid()
      }}
    >
      <PaymentElement />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!stripe}><Lock className="h-4 w-4" aria-hidden /> Pay {money(amount, currency)}</Button>
    </form>
  )
}

export function PaymentStep({ bookingId, payment, publishableKey, demo, onPaid }: { bookingId: string; payment: PaymentIntentInfo; publishableKey?: string | null; demo: boolean; onPaid: () => void }) {
  const demoPay = useMutation({
    mutationFn: () => api(`/payments/demo/${payment.paymentIntentId}/succeed`, { method: 'POST' }),
    onSuccess: onPaid,
  })
  if (publishableKey && !demo) {
    return (
      <Elements stripe={getStripe(publishableKey)} options={{ clientSecret: payment.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0f766e', borderRadius: '10px' } } }}>
        <StripeForm bookingId={bookingId} amount={payment.amountCents} currency={payment.currency} onPaid={onPaid} />
      </Elements>
    )
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Demo payments.</strong> Stripe keys are not configured, so no real payment form is shown. The button below simulates a successful payment webhook.
      </div>
      {demoPay.isError && <p role="alert" className="text-sm text-destructive">{demoPay.error instanceof ApiError ? demoPay.error.message : 'Payment failed'}</p>}
      <Button size="lg" className="w-full" loading={demoPay.isPending} onClick={() => demoPay.mutate()}>
        <Lock className="h-4 w-4" aria-hidden /> Simulate payment of {money(payment.amountCents, payment.currency)}
      </Button>
    </div>
  )
}
