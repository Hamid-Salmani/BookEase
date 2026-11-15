import { useEffect } from 'react'
import { useBusiness } from '@/hooks/queries'

/** Sets the document title (and social description) for the current route. */
export function usePageTitle(title?: string, description?: string) {
  const { data: business } = useBusiness()
  const site = business?.name ?? 'BookEase'
  useEffect(() => {
    document.title = title ? `${title} · ${site}` : `${site} · Book online`
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description, site])
}
