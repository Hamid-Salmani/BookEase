import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from './shared'
import { EmptyState, ErrorState, Spinner } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { useBusiness } from '@/hooks/queries'
import { api } from '@/lib/api'
import { money, parseYmd, ymd } from '@/lib/time'
import type { Reports } from '@/lib/types'

const BLUE = '#2a78d6'
const GRID = 'hsl(var(--border))'
const tick = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }

function ChartCard({ title, subtitle, empty, children }: { title: string; subtitle: string; empty: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{subtitle}</p></CardHeader>
      <CardContent>{empty ? <EmptyState title="No data for this period" /> : <div className="h-72">{children}</div>}</CardContent>
    </Card>
  )
}

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map(([k, v]) => <p key={k} className="flex justify-between gap-4"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></p>)}
    </div>
  )
}

export default function ReportsPage() {
  const { data: business } = useBusiness()
  const [from, setFrom] = useState(() => ymd(subDays(new Date(), 29)))
  const [to, setTo] = useState(() => ymd(new Date()))
  const query = useQuery({ queryKey: ['admin', 'reports', from, to], queryFn: () => api<Reports>('/admin/reports', { query: { from, to } }), placeholderData: (p) => p })
  const r = query.data
  const currency = r?.currency ?? business?.currency ?? 'usd'
  const totals = useMemo(() => ({ revenue: r?.revenue.reduce((a, x) => a + x.revenueCents, 0) ?? 0, bookings: r?.revenue.reduce((a, x) => a + x.bookings, 0) ?? 0 }), [r])
  const hours = useMemo(() => r?.busiestHours.map((h) => ({ ...h, label: format(new Date(2000, 0, 1, h.hour), 'h a') })) ?? [], [r])
  const fmtDay = (d: string) => format(parseYmd(d), 'MMM d')

  return (
    <>
      <PageHeader title="Reports" description="Revenue and demand trends from paid bookings."
        actions={<div className="flex items-center gap-2"><Input type="date" aria-label="From" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /><span className="text-muted-foreground">to</span><Input type="date" aria-label="To" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div>} />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <Spinner />}
      {r && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ChartCard title="Revenue" subtitle={`${money(totals.revenue, currency)} from ${totals.bookings} bookings`} empty={totals.bookings === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={r.revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                  <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BLUE} stopOpacity={0.25} /><stop offset="100%" stopColor={BLUE} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDay} tick={tick} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickFormatter={(v) => money(v, currency).replace(/\.00$/, '')} tick={tick} tickLine={false} axisLine={false} width={64} />
                  <Tooltip cursor={{ stroke: BLUE, strokeOpacity: 0.3 }} content={({ active, payload }) => active && payload?.length ? <TooltipBox title={fmtDay(payload[0].payload.date)} rows={[['Revenue', money(payload[0].payload.revenueCents, currency)], ['Bookings', String(payload[0].payload.bookings)]]} /> : null} />
                  <Area type="monotone" dataKey="revenueCents" name="Revenue" stroke={BLUE} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard title="Top services" subtitle="By number of bookings" empty={r.topServices.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.topServices} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={tick} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} content={({ active, payload }) => active && payload?.length ? <TooltipBox title={payload[0].payload.name} rows={[['Bookings', String(payload[0].payload.bookings)], ['Revenue', money(payload[0].payload.revenueCents, currency)]]} /> : null} />
                <Bar dataKey="bookings" name="Bookings" fill={BLUE} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Busiest hours" subtitle="Bookings by start time" empty={hours.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={32} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} content={({ active, payload }) => active && payload?.length ? <TooltipBox title={payload[0].payload.label} rows={[['Bookings', String(payload[0].payload.bookings)]]} /> : null} />
                <Bar dataKey="bookings" name="Bookings" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </>
  )
}
