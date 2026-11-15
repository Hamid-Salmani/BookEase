import { BarChart3, CalendarDays, ClipboardList, ExternalLink, Home, ListChecks, LogOut, Palmtree, Scissors, Settings, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useBusiness } from '@/hooks/queries'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const items = [
  { to: '/admin', label: 'Overview', icon: Home, end: true, admin: true },
  { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/admin/services', label: 'Services', icon: Scissors, admin: true },
  { to: '/admin/staff', label: 'Staff', icon: Users, admin: true },
  { to: '/admin/time-off', label: 'Time off', icon: Palmtree, admin: true },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, admin: true },
  { to: '/admin/audit', label: 'Audit log', icon: ListChecks, admin: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings, admin: true },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { data: business } = useBusiness()
  const navigate = useNavigate()
  const visible = items.filter((i) => !i.admin || user?.role === 'Admin')
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px,1fr]">
      <aside className="border-b bg-card md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex h-16 items-center px-5"><Logo name={business?.name} /></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {visible.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cn('flex min-h-10 shrink-0 items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <i.icon className="h-4 w-4" aria-hidden />{i.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t p-4 md:absolute md:bottom-0 md:left-0 md:right-0 md:block">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="mb-2 text-xs text-muted-foreground">{user?.role}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={async () => { await logout(); navigate('/') }}><LogOut className="h-4 w-4" aria-hidden /> Sign out</Button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-1 border-b bg-background/90 px-4 backdrop-blur sm:px-8">
          <Button variant="ghost" size="sm" asChild><Link to="/"><ExternalLink className="h-4 w-4" aria-hidden /> View site</Link></Button>
          <ThemeToggle />
        </header>
        <main id="main" className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
