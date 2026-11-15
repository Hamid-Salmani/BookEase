import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from './shared'
import { ComboboxField } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/form'
import { Spinner } from '@/components/states'
import { useBusiness } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { usePageTitle } from '@/lib/usePageTitle'

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  timeZoneId: z.string().min(1, 'Required'),
  currency: z.string().length(3, '3-letter code'),
  contactEmail: z.string().email(),
  cancellationWindowHours: z.number().int().min(0).max(720),
  minNoticeMinutes: z.number().int().min(0).max(10080),
  maxAdvanceDays: z.number().int().min(1).max(730),
  slotStepMinutes: z.number().int().min(5).max(240),
})
type FormValues = z.infer<typeof schema>

const FALLBACK_ZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Tehran', 'Asia/Tokyo', 'Australia/Sydney']

function useTimeZones(current?: string) {
  return useMemo(() => {
    const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? FALLBACK_ZONES
    const all = new Set(['UTC', ...list])
    if (current) all.add(current)
    return [...all].sort().map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))
  }, [current])
}

export default function SettingsPage() {
  usePageTitle('Settings')
  const { data: business } = useBusiness()
  const queryClient = useQueryClient()
  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const zones = useTimeZones(business?.timeZoneId)
  useEffect(() => { if (business) reset({ ...business, description: business.description ?? '' }) }, [business, reset])
  const save = useMutation({
    mutationFn: (v: FormValues) => api('/admin/business', { method: 'PUT', body: { ...v, description: v.description || null, currency: v.currency.toLowerCase() } }),
    onSuccess: () => { toast.success('Settings saved'); queryClient.invalidateQueries({ queryKey: ['business'] }); queryClient.invalidateQueries({ queryKey: ['slots'] }); queryClient.invalidateQueries({ queryKey: ['month'] }) },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'The settings were not saved. Check your connection and try again.'),
  })
  if (!business) return <Spinner />
  const f = (id: keyof FormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field label={label} htmlFor={id} error={errors[id]?.message as string | undefined} hint={hint}><Input id={id} aria-invalid={!!errors[id]} {...props} {...register(id, { valueAsNumber: props.type === 'number' })} /></Field>
  )
  return (
    <>
      <PageHeader title="Settings" description="Business profile and booking rules." />
      <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="max-w-3xl space-y-6">
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Business</h2>
          {f('name', 'Name')}
          <Field label="Description" htmlFor="description"><Textarea id="description" {...register('description')} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Time zone" htmlFor="timeZoneId" error={errors.timeZoneId?.message} hint="Slots and reports follow this zone.">
              <Controller control={control} name="timeZoneId" render={({ field }) => <ComboboxField id="timeZoneId" value={field.value ?? ''} onValueChange={(v) => field.onChange(v)} options={zones} placeholder="Choose a zone" searchPlaceholder="Search zones, e.g. New York" invalid={!!errors.timeZoneId} />} />
            </Field>
            {f('currency', 'Currency', { maxLength: 3 })}
            {f('contactEmail', 'Contact email', { type: 'email' })}
          </div>
        </Card>
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Booking rules</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('cancellationWindowHours', 'Free cancellation window (hours)', { type: 'number' }, 'Refunds and rescheduling are free until this long before the start.')}
            {f('minNoticeMinutes', 'Minimum notice (minutes)', { type: 'number' })}
            {f('maxAdvanceDays', 'Max days in advance', { type: 'number' })}
            {f('slotStepMinutes', 'Slot interval (minutes)', { type: 'number' })}
          </div>
        </Card>
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>Save changes</Button>
      </form>
    </>
  )
}
