import { Link } from 'react-router-dom'
import { IllustrationSearch } from '@/components/illustrations'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/lib/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className="container flex flex-col items-center py-20 text-center">
      <IllustrationSearch />
      <p className="mt-4 text-sm font-medium tabular-nums text-primary">404</p>
      <h1 className="mt-1 text-h1">That page isn't here</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">The link may be out of date or the address mistyped. The services list is a good place to start over.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild><Link to="/services">See services</Link></Button>
        <Button variant="outline" asChild><Link to="/">Home</Link></Button>
      </div>
    </div>
  )
}
