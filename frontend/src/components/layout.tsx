import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useBusiness } from '@/hooks/queries'
import { Button } from './ui/button'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

/** The business mark: its initial in the display face. There is no logo upload in the settings, so the name carries the brand. */
export function BrandMark({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary font-display text-lg font-semibold leading-none text-primary-foreground', className)} aria-hidden>
      {(name?.trim()[0] ?? 'B').toUpperCase()}
    </span>
  )
}

export function Logo({ name }: { name?: string }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
      <BrandMark name={name} />
      <span className="truncate">{name ?? 'BookEase'}</span>
    </Link>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative rounded-control px-3 py-2.5 text-sm font-medium transition-colors hover:text-foreground md:py-2',
    isActive ? 'text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary' : 'text-muted-foreground',
  )

export function SiteLayout() {
  const { user, logout } = useAuth()
  const { data: business } = useBusiness()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-card focus:p-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Logo name={business?.name} />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLink to="/services" className={navClass}>Services</NavLink>
            {user && <NavLink to="/my-bookings" className={navClass}>My bookings</NavLink>}
            {(user?.role === 'Admin' || user?.role === 'Staff') && <NavLink to="/admin" className={navClass}>Dashboard</NavLink>}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="hidden items-center gap-2 pl-2 md:flex">
              {user ? (
                <>
                  <span className="max-w-40 truncate text-sm text-muted-foreground">{user.fullName}</span>
                  <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/') }}><LogOut className="h-4 w-4" aria-hidden /> Sign out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
                  <Button size="sm" asChild><Link to="/book">Book now</Link></Button>
                </>
              )}
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Mobile" className="container flex flex-col gap-1 border-t pb-4 pt-2 md:hidden">
            <NavLink to="/services" className={navClass} onClick={close}>Services</NavLink>
            {user && <NavLink to="/my-bookings" className={navClass} onClick={close}>My bookings</NavLink>}
            {(user?.role === 'Admin' || user?.role === 'Staff') && <NavLink to="/admin" className={navClass} onClick={close}>Dashboard</NavLink>}
            <NavLink to="/book" className={navClass} onClick={close}>Book now</NavLink>
            {user ? <button className="rounded-control px-3 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground" onClick={async () => { close(); await logout(); navigate('/') }}>Sign out</button>
              : <NavLink to="/login" className={navClass} onClick={close}>Sign in</NavLink>}
          </nav>
        )}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="container flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2.5"><BrandMark name={business?.name} className="h-6 w-6 text-sm" /> <span>&copy; {new Date().getFullYear()} {business?.name ?? 'BookEase'}</span></span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {business?.contactEmail && <a className="hover:text-foreground hover:underline" href={`mailto:${business.contactEmail}`}>{business.contactEmail}</a>}
            {business && <span>Times shown in {business.timeZoneId.replace(/_/g, ' ')}</span>}
          </span>
        </div>
      </footer>
    </div>
  )
}
