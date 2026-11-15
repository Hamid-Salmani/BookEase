import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BookingDialog, PageHeader, Pagination, TableCard, Th, useDebounced } from './shared'
import { ComboboxField, DateRangePicker, FilterBar, formatRange, SearchInput, SelectField, type ActiveFilter } from '@/components/form'
import { IllustrationSearch } from '@/components/illustrations'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { useBusiness, useServices } from '@/hooks/queries'
import { api, ApiError, download } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtDateTime, money } from '@/lib/time'
import type { Booking, Paged, Staff } from '@/lib/types'
import { usePageTitle } from '@/lib/usePageTitle'

const statusOptions = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'NoShow', label: 'No-show' },
]

const emptyFilters = { search: '', status: '', staffId: '', serviceId: '', from: '', to: '' }

export default function AdminBookingsPage() {
  usePageTitle('Bookings')
  const { data: business } = useBusiness()
  const { user } = useAuth()
  const services = useServices()
  const staff = useQuery({ queryKey: ['admin', 'staff-all'], queryFn: () => api<Paged<Staff>>('/admin/staff', { query: { pageSize: 100 } }), enabled: user?.role === 'Admin' })
  const [filters, setFilters] = useState(emptyFilters)
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
  const patch = (p: Partial<typeof filters>) => { setFilters((f) => ({ ...f, ...p })); setPage(1) }
  const onSort = (key: string) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))

  const staffOptions = useMemo(() => staff.data?.items.map((s) => ({ value: s.id, label: s.name, description: s.title })) ?? [], [staff.data])
  const serviceOptions = useMemo(() => services.data?.map((s) => ({ value: s.id, label: s.name })) ?? [], [services.data])

  const active: ActiveFilter[] = []
  if (filters.search) active.push({ key: 'search', label: 'Search', value: filters.search, onRemove: () => patch({ search: '' }) })
  if (filters.status) active.push({ key: 'status', label: 'Status', value: statusOptions.find((o) => o.value === filters.status)?.label ?? filters.status, onRemove: () => patch({ status: '' }) })
  if (filters.staffId) active.push({ key: 'staff', label: 'Specialist', value: staffOptions.find((o) => o.value === filters.staffId)?.label ?? '...', onRemove: () => patch({ staffId: '' }) })
  if (filters.serviceId) active.push({ key: 'service', label: 'Service', value: serviceOptions.find((o) => o.value === filters.serviceId)?.label ?? '...', onRemove: () => patch({ serviceId: '' }) })
  if (filters.from || filters.to) active.push({ key: 'dates', label: 'Dates', value: formatRange({ from: filters.from, to: filters.to }), onRemove: () => patch({ from: '', to: '' }) })

  return (
    <>
      <PageHeader title="Bookings" description="Search, filter and manage every appointment."
        actions={<Button variant="outline" onClick={() => download('/admin/bookings/export', params, 'bookings.csv').catch((e) => toast.error(e instanceof ApiError ? e.message : 'The export did not download. Try again in a moment.'))}><Download className="h-4 w-4" aria-hidden /> Export CSV</Button>} />
      <FilterBar
        search={<SearchInput aria-label="Search" placeholder="Customer or reference" value={filters.search} onChange={(v) => patch({ search: v })} />}
        active={active}
        onClearAll={() => { setFilters(emptyFilters); setPage(1) }}
      >
        <SelectField aria-label="Status" className="w-full lg:w-36" emptyLabel="All statuses" value={filters.status} onValueChange={(v) => patch({ status: v })} options={statusOptions} />
        {user?.role === 'Admin' && <ComboboxField aria-label="Specialist" className="w-full lg:w-44" emptyLabel="All specialists" searchPlaceholder="Find a specialist" value={filters.staffId} onValueChange={(v) => patch({ staffId: v })} options={staffOptions} />}
        <ComboboxField aria-label="Service" className="w-full lg:w-44" emptyLabel="All services" searchPlaceholder="Find a service" value={filters.serviceId} onValueChange={(v) => patch({ serviceId: v })} options={serviceOptions} />
        <DateRangePicker aria-label="Date range" className="w-full lg:w-52" tz={tz} value={{ from: filters.from, to: filters.to }} onChange={(r) => patch(r)} />
      </FilterBar>
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} title="Bookings didn't load" />}
      {query.isLoading && <TableSkeleton rows={8} cols={6} />}
      {query.data && query.data.items.length === 0 && (
        <EmptyState
          illustration={<IllustrationSearch />}
          title={active.length > 0 ? 'No bookings match' : 'No bookings yet'}
          description={active.length > 0 ? 'Try a wider date range or remove a filter.' : 'Bookings will appear here as soon as customers start booking.'}
          action={active.length > 0 ? <Button variant="outline" onClick={() => { setFilters(emptyFilters); setPage(1) }}>Clear filters</Button> : undefined}
        />
      )}
      {query.data && query.data.items.length > 0 && (
        <TableCard footer={<Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalCount} onPage={setPage} />}>
          <table className="w-full text-sm">
            <thead><tr>
              <Th sort="start" current={sort.key} desc={sort.desc} onSort={onSort}>When</Th>
              <Th sort="customer" current={sort.key} desc={sort.desc} onSort={onSort}>Customer</Th>
              <Th sort="service" current={sort.key} desc={sort.desc} onSort={onSort}>Service</Th>
              <Th>Specialist</Th>
              <Th sort="price" current={sort.key} desc={sort.desc} onSort={onSort} align="right">Price</Th>
              <Th sort="status" current={sort.key} desc={sort.desc} onSort={onSort}>Status</Th>
            </tr></thead>
            <tbody className="divide-y">
              {query.data.items.map((b) => (
                <tr key={b.id} className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:bg-muted/60" onClick={() => setSelected(b)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(b)}>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{fmtDateTime(b.startUtc, tz)}</td>
                  <td className="px-4 py-2.5"><span className="block font-medium">{b.customerName}</span><span className="text-xs tabular-nums text-muted-foreground">{b.reference}</span></td>
                  <td className="px-4 py-2.5">{b.serviceName}</td>
                  <td className="px-4 py-2.5">{b.staffName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(b.priceCents, b.currency)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={b.status} admin /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>{selected && <BookingDialog booking={selected} tz={tz} onClose={() => setSelected(null)} />}</Dialog>
    </>
  )
}
