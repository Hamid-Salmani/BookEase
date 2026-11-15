import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Availability, Business, MonthAvailability, PublicConfig, Service, Staff } from '@/lib/types'

export const useBusiness = () => useQuery({ queryKey: ['business'], queryFn: () => api<Business>('/business'), staleTime: 5 * 60_000 })
export const usePublicConfig = () => useQuery({ queryKey: ['config'], queryFn: () => api<PublicConfig>('/config'), staleTime: 5 * 60_000 })
export const useServices = () => useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') })
export const useStaff = (serviceId?: string) =>
  useQuery({ queryKey: ['staff', serviceId], queryFn: () => api<Staff[]>('/staff', { query: { serviceId } }) })
export const useDaySlots = (serviceId?: string, date?: string, staffId?: string | null) =>
  useQuery({
    queryKey: ['slots', serviceId, date, staffId],
    enabled: Boolean(serviceId && date),
    queryFn: () => api<Availability>('/availability', { query: { serviceId, date, staffId } }),
  })
export const useMonthAvailability = (serviceId?: string, month?: string, staffId?: string | null) =>
  useQuery({
    queryKey: ['month', serviceId, month, staffId],
    enabled: Boolean(serviceId && month),
    queryFn: () => api<MonthAvailability>('/availability/month', { query: { serviceId, month, staffId } }),
  })
