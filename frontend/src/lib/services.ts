import type { Service } from './types'

export interface ServiceGroup { category: string | null; items: Service[] }

/** Groups by category in first-seen order. Services without a category share one unlabelled group. */
export function groupServices(services: Service[]): ServiceGroup[] {
  const groups = new Map<string | null, Service[]>()
  for (const s of services) {
    const key = s.category?.trim() || null
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }))
}

/** "America/New_York" -> "New York" */
export const cityOf = (tz: string) => (tz.split('/').pop() ?? tz).replace(/_/g, ' ')
