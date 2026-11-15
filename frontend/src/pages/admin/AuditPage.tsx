import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader, Pagination, TableCard, Th } from './shared'
import { IllustrationLog } from '@/components/illustrations'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { useBusiness } from '@/hooks/queries'
import { api } from '@/lib/api'
import { fmtDateTime } from '@/lib/time'
import type { AuditLog, Paged } from '@/lib/types'
import { usePageTitle } from '@/lib/usePageTitle'

export default function AuditPage() {
  usePageTitle('Audit log')
  const { data: business } = useBusiness()
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['admin', 'audit', page], queryFn: () => api<Paged<AuditLog>>('/admin/audit-logs', { query: { page, pageSize: 20, desc: true } }), placeholderData: (p) => p })
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when." />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} title="The log didn't load" />}
      {query.isLoading && <TableSkeleton rows={8} cols={5} />}
      {query.data?.items.length === 0 && <EmptyState illustration={<IllustrationLog />} title="Quiet so far" description="Changes to bookings, services, staff and settings will be recorded here." />}
      {query.data && query.data.items.length > 0 && (
        <TableCard footer={<Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalCount} onPage={setPage} />}>
          <table className="w-full text-sm">
            <thead><tr>{['When', 'User', 'Action', 'Entity', 'Details'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody className="divide-y">
              {query.data.items.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums">{fmtDateTime(l.createdAt, business?.timeZoneId ?? 'UTC')}</td>
                  <td className="px-4 py-2">{l.userEmail ?? 'system'}</td>
                  <td className="px-4 py-2 font-medium">{l.action}</td>
                  <td className="px-4 py-2">{l.entityName}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-muted-foreground" title={l.details ?? ''}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </>
  )
}
