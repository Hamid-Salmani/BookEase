import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader, Pagination, TableCard, Th, useDebounced } from './shared'
import { SearchInput } from '@/components/form'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { IllustrationList, IllustrationSearch } from '@/components/illustrations'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/form'
import { SwitchField } from '@/components/ui/switch'
import { useBusiness } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { duration, money } from '@/lib/time'
import type { Paged, Service } from '@/lib/types'
import { usePageTitle } from '@/lib/usePageTitle'

const schema = z.object({
  name: z.string().min(2, 'Name is required').max(120),
  description: z.string().max(1000),
  durationMinutes: z.number().int().min(5, 'Min 5 minutes').max(480),
  bufferMinutes: z.number().int().min(0).max(120),
  price: z.number().min(0, 'Cannot be negative'),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function ServiceForm({ service, currency, onClose }: { service?: Service; currency: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: service
      ? { name: service.name, description: service.description, durationMinutes: service.durationMinutes, bufferMinutes: service.bufferMinutes, price: service.priceCents / 100, isActive: service.isActive }
      : { name: '', description: '', durationMinutes: 60, bufferMinutes: 0, price: 0, isActive: true },
  })
  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = { name: v.name, description: v.description, durationMinutes: v.durationMinutes, bufferMinutes: v.bufferMinutes, priceCents: Math.round(v.price * 100), isActive: v.isActive }
      return api(service ? `/admin/services/${service.id}` : '/admin/services', { method: service ? 'PUT' : 'POST', body })
    },
    onSuccess: () => { toast.success('Service saved'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['services'] }); onClose() },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'The service was not saved. Check your connection and try again.'),
  })
  return (
    <DialogContent title={service ? 'Edit service' : 'New service'}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Field label="Name" htmlFor="name" error={errors.name?.message}><Input id="name" aria-invalid={!!errors.name} {...register('name')} /></Field>
        <Field label="Description" htmlFor="description" error={errors.description?.message}><Textarea id="description" {...register('description')} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Duration (min)" htmlFor="durationMinutes" error={errors.durationMinutes?.message}><Input id="durationMinutes" type="number" {...register('durationMinutes', { valueAsNumber: true })} /></Field>
          <Field label="Buffer (min)" htmlFor="bufferMinutes" error={errors.bufferMinutes?.message}><Input id="bufferMinutes" type="number" {...register('bufferMinutes', { valueAsNumber: true })} /></Field>
          <Field label={`Price (${currency.toUpperCase()})`} htmlFor="price" error={errors.price?.message}><Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} /></Field>
        </div>
        <Controller control={control} name="isActive" render={({ field }) => <SwitchField label="Active" description="Hidden services cannot be booked." checked={field.value} onCheckedChange={field.onChange} />} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </DialogContent>
  )
}

export default function AdminServicesPage() {
  usePageTitle('Services')
  const { data: business } = useBusiness()
  const queryClient = useQueryClient()
  const currency = business?.currency ?? 'usd'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'name', desc: false })
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [removing, setRemoving] = useState<Service | null>(null)
  const q = useDebounced(search)
  const query = useQuery({
    queryKey: ['admin', 'services', q, page, sort],
    queryFn: () => api<Paged<Service>>('/admin/services', { query: { search: q, page, pageSize: 10, sort: sort.key, desc: sort.desc } }),
    placeholderData: (p) => p,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Service deleted'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['services'] }) },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'The service was not deleted. Check your connection and try again.'),
  })
  const onSort = (key: string) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))
  return (
    <>
      <PageHeader title="Services" description="What customers can book." actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden /> New service</Button>} />
      <SearchInput className="mb-4 max-w-sm" placeholder="Search services" aria-label="Search services" value={search} onChange={(v) => { setSearch(v); setPage(1) }} />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <TableSkeleton rows={5} cols={5} />}
      {query.data?.items.length === 0 && (search
        ? <EmptyState illustration={<IllustrationSearch />} title="No service by that name" description="Check the spelling or clear the search." action={<Button variant="outline" onClick={() => setSearch('')}>Clear search</Button>} />
        : <EmptyState illustration={<IllustrationList />} title="Nothing on the menu yet" description="Add a service with a price and a length and it becomes bookable once someone on staff offers it." action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden /> New service</Button>} />)}
      {query.data && query.data.items.length > 0 && (
        <TableCard footer={<Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalCount} onPage={setPage} />}>
          <table className="w-full text-sm">
            <thead><tr>
              <Th sort="name" current={sort.key} desc={sort.desc} onSort={onSort}>Service</Th>
              <Th sort="duration" current={sort.key} desc={sort.desc} onSort={onSort}>Duration</Th>
              <Th sort="price" current={sort.key} desc={sort.desc} onSort={onSort} align="right">Price</Th>
              <Th>Status</Th><Th><span className="sr-only">Actions</span></Th>
            </tr></thead>
            <tbody className="divide-y">
              {query.data.items.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5 tabular-nums">{duration(s.durationMinutes)}{s.bufferMinutes > 0 && <span className="text-muted-foreground"> +{s.bufferMinutes}m</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(s.priceCents, currency)}</td>
                  <td className="px-4 py-2.5"><Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Hidden'}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-1.5 text-right">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => setRemoving(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title={`Delete ${removing?.name ?? 'this service'}?`} description="Services that already have bookings are hidden instead of deleted." onConfirm={() => removing && remove.mutate(removing.id)} />
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <ServiceForm key={editing === 'new' ? 'new' : editing.id} service={editing === 'new' ? undefined : editing} currency={currency} onClose={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}
