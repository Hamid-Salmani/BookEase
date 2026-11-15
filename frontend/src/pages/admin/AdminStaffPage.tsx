import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from './shared'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/form'
import { useServices } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import type { Paged, Staff, WorkingHours } from '@/lib/types'

const schema = z.object({ name: z.string().min(2, 'Name is required').max(120), title: z.string().min(2, 'Title is required').max(120), bio: z.string().max(1000).optional(), isActive: z.boolean() })
type FormValues = z.infer<typeof schema>

function StaffForm({ staff, onClose }: { staff?: Staff; onClose: () => void }) {
  const queryClient = useQueryClient()
  const services = useServices()
  const [serviceIds, setServiceIds] = useState<string[]>(staff?.serviceIds ?? [])
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: staff?.name ?? '', title: staff?.title ?? '', bio: staff?.bio ?? '', isActive: staff?.isActive ?? true } })
  const save = useMutation({
    mutationFn: (v: FormValues) => api(staff ? `/admin/staff/${staff.id}` : '/admin/staff', { method: staff ? 'PUT' : 'POST', body: { ...v, bio: v.bio || null, serviceIds } }),
    onSuccess: () => { toast.success('Staff member saved'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['staff'] }); onClose() },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save'),
  })
  return (
    <DialogContent title={staff ? 'Edit staff member' : 'New staff member'}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message}><Input id="name" aria-invalid={!!errors.name} {...register('name')} /></Field>
          <Field label="Title" htmlFor="title" error={errors.title?.message}><Input id="title" aria-invalid={!!errors.title} {...register('title')} /></Field>
        </div>
        <Field label="Bio" htmlFor="bio"><Textarea id="bio" {...register('bio')} /></Field>
        <fieldset><legend className="mb-2 text-sm font-medium">Services offered</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.data?.map((s) => <Checkbox key={s.id} label={s.name} checked={serviceIds.includes(s.id)} onChange={(e) => setServiceIds(e.target.checked ? [...serviceIds, s.id] : serviceIds.filter((x) => x !== s.id))} />)}
          </div>
        </fieldset>
        <Checkbox label="Active (bookable)" {...register('isActive')} />
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
      </form>
    </DialogContent>
  )
}

const days = [1, 2, 3, 4, 5, 6, 0]
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
type Row = { enabled: boolean; start: string; end: string }
const trim = (t: string) => t.slice(0, 5)

function HoursForm({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<Record<number, Row>>()
  const hours = useQuery({
    queryKey: ['admin', 'hours', staff.id],
    queryFn: async () => {
      const list = await api<WorkingHours[]>(`/admin/staff/${staff.id}/working-hours`)
      const map: Record<number, Row> = {}
      for (const d of days) { const h = list.find((x) => x.dayOfWeek === d); map[d] = { enabled: !!h, start: h ? trim(h.startTime) : '09:00', end: h ? trim(h.endTime) : '17:00' } }
      setRows(map)
      return list
    },
    staleTime: 0,
  })
  const save = useMutation({
    mutationFn: () => api(`/admin/staff/${staff.id}/working-hours`, { method: 'PUT', body: { items: days.filter((d) => rows![d].enabled).map((d) => ({ dayOfWeek: d, startTime: rows![d].start, endTime: rows![d].end })) } }),
    onSuccess: () => { toast.success('Working hours saved'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['slots'] }); queryClient.invalidateQueries({ queryKey: ['month'] }); onClose() },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save'),
  })
  const set = (d: number, patch: Partial<Row>) => setRows({ ...rows!, [d]: { ...rows![d], ...patch } })
  return (
    <DialogContent title={`Working hours: ${staff.name}`} description="Times are in the business time zone.">
      {hours.isError && <ErrorState error={hours.error} onRetry={() => hours.refetch()} />}
      {!rows && !hours.isError && <ListSkeleton rows={7} height="h-9" />}
      {rows && (
        <div className="space-y-2">
          {days.map((d) => (
            <div key={d} className="grid grid-cols-[110px,1fr,1fr] items-center gap-2">
              <Checkbox label={dayNames[d]} checked={rows[d].enabled} onChange={(e) => set(d, { enabled: e.target.checked })} />
              <Input type="time" aria-label={`${dayNames[d]} start`} disabled={!rows[d].enabled} value={rows[d].start} onChange={(e) => set(d, { start: e.target.value })} />
              <Input type="time" aria-label={`${dayNames[d]} end`} disabled={!rows[d].enabled} value={rows[d].end} onChange={(e) => set(d, { end: e.target.value })} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-3"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save hours</Button></div>
        </div>
      )}
    </DialogContent>
  )
}

export default function AdminStaffPage() {
  const queryClient = useQueryClient()
  const services = useServices()
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [hoursFor, setHoursFor] = useState<Staff | null>(null)
  const query = useQuery({ queryKey: ['admin', 'staff', 'list'], queryFn: () => api<Paged<Staff>>('/admin/staff', { query: { pageSize: 100 } }) })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Staff member removed'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['staff'] }) },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not delete'),
  })
  return (
    <>
      <PageHeader title="Staff" description="Your team, their services and weekly schedule." actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden /> New staff member</Button>} />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <ListSkeleton rows={3} />}
      {query.data?.items.length === 0 && <EmptyState title="No staff yet" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.items.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="font-semibold">{s.name}</h2><p className="text-sm text-muted-foreground">{s.title}</p></div>
              <Badge className={s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{s.serviceIds.map((id) => services.data?.find((x) => x.id === id)?.name).filter(Boolean).join(', ') || 'No services assigned'}</p>
            <div className="mt-4 flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setHoursFor(s)}><Clock className="h-4 w-4" aria-hidden /> Hours</Button>
              <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => confirm(`Remove ${s.name}? Staff with bookings are deactivated instead.`) && remove.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>{editing && <StaffForm key={editing === 'new' ? 'new' : editing.id} staff={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}</Dialog>
      <Dialog open={!!hoursFor} onOpenChange={(o) => !o && setHoursFor(null)}>{hoursFor && <HoursForm key={hoursFor.id} staff={hoursFor} onClose={() => setHoursFor(null)} />}</Dialog>
    </>
  )
}
