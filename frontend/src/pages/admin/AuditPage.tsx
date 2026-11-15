import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader, Pagination } from './shared'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useBusiness } from '@/hooks/queries'
import { api } from '@/lib/api'
import { fmtDateTime } from '@/lib/time'
import type { AuditLog, Paged } from '@/lib/types'

export default function AuditPage() {
  const { data: business } = useBusiness()
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['admin', 'audit', page], queryFn: () => api<Paged<AuditLog>>('/admin/audit-logs', { query: { page, pageSize: 20, desc: true } }), placeholderData: (p) => p })
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when." />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && <ListSkeleton rows={8} height="h-10" />}
      {query.data?.items.length === 0 && <EmptyState title="No activity yet" />}
      {query.data && query.data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/40"><tr>{['When', 'User', 'Action', 'Entity', 'Details'].map((h) => <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {query.data.items.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2.5">{fmtDateTime(l.createdAt, business?.timeZoneId ?? 'UTC')}</td>
                  <td className="px-4 py-2.5">{l.userEmail ?? 'system'}</td>
                  <td className="px-4 py-2.5 font-medium">{l.action}</td>
                  <td className="px-4 py-2.5">{l.entityName}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-muted-foreground" title={l.details ?? ''}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalCount} onPage={setPage} />
        </div>
      )}
    </>
  )
}
