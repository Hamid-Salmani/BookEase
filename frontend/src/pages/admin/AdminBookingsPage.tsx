import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BookingDialog, PageHeader, Pagination, Th, useDebounced } from './shared'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/form'
import { useBusiness, useServices } from '@/hooks/queries'
import { api, ApiError, download } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtDateTime, money } from '@/lib/time'
import type { Booking, Paged, Staff } from '@/lib/types'

const statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow']

export default function AdminBookingsPage() {
  const { data: business } = useBusiness()
  const { user } = useAuth()
  const services = useServices()
  const staff = useQuery({ queryKey: ['admin', 'staff-all'], queryFn: () => api<Paged<Staff>>('/admin/staff', { query: { pageSize: 100 } }), enabled: user?.role === 'Admin' })
  const [filters, setFilters] = useState({ search: '', status: '', staffId: '', serviceId: '', from: '', to: '' })
  const [sort, setSort] = useState({ key: 'start', desc: true })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Booking | null>(null)
  const search = useDebounced(filters.search)
  const tz = business?.timeZoneId ?? 'UTC'
  const params = { ...filters, search, sort: sort.key, desc: sort.desc }
  const query = useQuery({
    queryKey: ['admin', 'bookings', params, page],
    queryFn: () => api<Paged<Booking>>('/admin/bookings', { query: { ...params, page, pageSize: 15 } }),
    placeholderData: (prev) => prev,
  })
  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1) }
  const onSort = (key: string) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))

  return (
    <>
      <PageHeader title="Bookings" description="Search, filter and manage every appointment."
        actions={<Button variant="outline" onClick={() => download('/admin/bookings/export', params, 'bookings.csv').catch((e) => toast.error(e instanceof ApiError ? e.message : 'Export failed'))}><Download className="h-4 w-4" aria-hidden /> Export CSV</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input className="lg:col-span-2" placeholder="Search customer, reference..." aria-label="Search" value={filters.search} onChange={set('search')} />
        <Select aria-label="Status" value={filters.status} onChange={set('status')}><option value="">All statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}</Select>
        {user?.role === 'Admin' && <Select aria-label="Specialist" value={filters.staffId} onChange={set('staffId')}><option value="">All specialists</option>{staff.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>}
        <Select aria-label="Service" value={filters.serviceId} onChange={set('serviceId')}><option value="">All services</option>{services.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <div className="flex gap-2"><Input type="date" aria-label="From date" value={filters.from} onChange={set('from')} /><Input type="date" aria-label="To date" value={filters.to} onChange={set('to')} /></div>
      </div>
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <ListSkeleton rows={6} height="h-12" />}
      {query.data && query.data.items.length === 0 && <EmptyState title="No bookings match your filters" />}
      {query.data && query.data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40"><tr>
                <Th sort="start" current={sort.key} desc={sort.desc} onSort={onSort}>When</Th>
                <Th sort="customer" current={sort.key} desc={sort.desc} onSort={onSort}>Customer</Th>
                <Th sort="service" current={sort.key} desc={sort.desc} onSort={onSort}>Service</Th>
                <Th>Specialist</Th>
                <Th sort="price" current={sort.key} desc={sort.desc} onSort={onSort}>Price</Th>
                <Th sort="status" current={sort.key} desc={sort.desc} onSort={onSort}>Status</Th>
              </tr></thead>
              <tbody className="divide-y">
                {query.data.items.map((b) => (
                  <tr key={b.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(b)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(b)}>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDateTime(b.startUtc, tz)}</td>
                    <td className="px-4 py-3"><span className="block font-medium">{b.customerName}</span><span className="text-xs text-muted-foreground">{b.reference}</span></td>
                    <td className="px-4 py-3">{b.serviceName}</td>
                    <td className="px-4 py-3">{b.staffName}</td>
                    <td className="px-4 py-3">{money(b.priceCents, b.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} admin /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalCount} onPage={setPage} />
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>{selected && <BookingDialog booking={selected} tz={tz} onClose={() => setSelected(null)} />}</Dialog>
    </>
  )
}
