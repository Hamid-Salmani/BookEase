import { CalendarCheck, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useBusiness } from '@/hooks/queries'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

export function Logo({ name }: { name?: string }) {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CalendarCheck className="h-4 w-4" aria-hidden /></span>
      <span>{name ?? 'BookEase'}</span>
    </Link>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent', isActive ? 'text-primary' : 'text-muted-foreground')

export function SiteLayout() {
  const { user, logout } = useAuth()
  const { data: business } = useBusiness()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:p-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Logo name={business?.name} />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLink to="/services" className={navClass}>Services</NavLink>
            {user && <NavLink to="/my-bookings" className={navClass}>My bookings</NavLink>}
            {(user?.role === 'Admin' || user?.role === 'Staff') && <NavLink to="/admin" className={navClass}>Dashboard</NavLink>}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user.fullName}</span>
                <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/') }}><LogOut className="h-4 w-4" aria-hidden /> Sign out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
                <Button size="sm" asChild><Link to="/book">Book now</Link></Button>
              </>
            )}
          </div>
          <button className="rounded-md p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="container flex flex-col gap-1 border-t pb-4 pt-2 md:hidden">
            <NavLink to="/services" className={navClass} onClick={close}>Services</NavLink>
            {user && <NavLink to="/my-bookings" className={navClass} onClick={close}>My bookings</NavLink>}
            {(user?.role === 'Admin' || user?.role === 'Staff') && <NavLink to="/admin" className={navClass} onClick={close}>Dashboard</NavLink>}
            <NavLink to="/book" className={navClass} onClick={close}>Book now</NavLink>
            {user ? <button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground" onClick={async () => { close(); await logout(); navigate('/') }}>Sign out</button>
              : <NavLink to="/login" className={navClass} onClick={close}>Sign in</NavLink>}
          </nav>
        )}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="container flex flex-col justify-between gap-2 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} {business?.name ?? 'BookEase'}</span>
          <span>{business?.contactEmail}</span>
        </div>
      </footer>
    </div>
  )
}
