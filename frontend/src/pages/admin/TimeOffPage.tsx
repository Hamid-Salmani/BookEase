import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, Pagination } from './shared'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/form'
import { useBusiness } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { fmtDateTime, inputToUtc, todayInTz } from '@/lib/time'
import type { Paged, Staff, TimeOff } from '@/lib/types'

function TimeOffForm({ staff, tz, onClose }: { staff: Staff[]; tz: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const today = todayInTz(tz)
  const [staffId, setStaffId] = useState(staff[0]?.id ?? '')
  const [start, setStart] = useState(`${today}T09:00`)
  const [end, setEnd] = useState(`${today}T17:00`)
  const [reason, setReason] = useState('')
  const save = useMutation({
    mutationFn: () => api('/admin/time-off', { method: 'POST', body: { staffId, startUtc: inputToUtc(start, tz), endUtc: inputToUtc(end, tz), reason: reason || null } }),
    onSuccess: () => { toast.success('Time off added'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['slots'] }); queryClient.invalidateQueries({ queryKey: ['month'] }); onClose() },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save'),
  })
  const invalid = !staffId || !start || !end || end <= start
  return (
    <DialogContent title="Add time off" description={`Times are in ${tz.replace('_', ' ')}.`}>
      <div className="space-y-4">
        <Field label="Specialist" htmlFor="to-staff"><Select id="to-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" htmlFor="to-start"><Input id="to-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Until" htmlFor="to-end" error={end <= start ? 'Must be after the start' : undefined}><Input id="to-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Reason (optional)" htmlFor="to-reason"><Input id="to-reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={invalid} loading={save.isPending} onClick={() => save.mutate()}>Add</Button></div>
      </div>
    </DialogContent>
  )
}

export default function TimeOffPage() {
  const { data: business } = useBusiness()
  const queryClient = useQueryClient()
  const tz = business?.timeZoneId ?? 'UTC'
  const [staffId, setStaffId] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const staff = useQuery({ queryKey: ['admin', 'staff-all'], queryFn: () => api<Paged<Staff>>('/admin/staff', { query: { pageSize: 100 } }) })
  const query = useQuery({ queryKey: ['admin', 'time-off', staffId, page], queryFn: () => api<Paged<TimeOff>>('/admin/time-off', { query: { staffId, page, pageSize: 10, desc: true } }), placeholderData: (p) => p })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/time-off/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Removed'); queryClient.invalidateQueries({ queryKey: ['admin'] }); queryClient.invalidateQueries({ queryKey: ['slots'] }); queryClient.invalidateQueries({ queryKey: ['month'] }) },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not delete'),
  })
  return (
    <>
      <PageHeader title="Time off" description="Block holidays and absences so they cannot be booked." actions={<Button disabled={!staff.data?.items.length} onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Add time off</Button>} />
      <Select className="mb-4 max-w-xs" aria-label="Filter by specialist" value={staffId} onChange={(e) => { setStaffId(e.target.value); setPage(1) }}>
        <option value="">All specialists</option>{staff.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <ListSkeleton rows={4} height="h-12" />}
      {query.data?.items.length === 0 && <EmptyState title="No time off scheduled" />}
      {query.data && query.data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {query.data.items.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div><p className="font-medium">{t.staffName}{t.reason && <span className="font-normal text-muted-foreground"> &middot; {t.reason}</span>}</p><p className="text-sm text-muted-foreground">{fmtDateTime(t.startUtc, tz)} &rarr; {fmtDateTime(t.endUtc, tz)}</p></div>
                <Button variant="ghost" size="icon" aria-label="Delete time off" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalCount} onPage={setPage} />
        </div>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>{adding && staff.data && <TimeOffForm staff={staff.data.items} tz={tz} onClose={() => setAdding(false)} />}</Dialog>
    </>
  )
}
