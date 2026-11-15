import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/layout'
import { RequireRole } from './components/RequireRole'
import { Spinner } from './components/states'
import Landing from './pages/Landing'
import ServicesPage from './pages/ServicesPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import BookPage from './pages/BookPage'
import ConfirmationPage from './pages/ConfirmationPage'
import MyBookingsPage from './pages/MyBookingsPage'
import NotFound from './pages/NotFound'

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const OverviewPage = lazy(() => import('./pages/admin/OverviewPage'))
const CalendarPage = lazy(() => import('./pages/admin/CalendarPage'))
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'))
const AdminServicesPage = lazy(() => import('./pages/admin/AdminServicesPage'))
const AdminStaffPage = lazy(() => import('./pages/admin/AdminStaffPage'))
const TimeOffPage = lazy(() => import('./pages/admin/TimeOffPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const AuditPage = lazy(() => import('./pages/admin/AuditPage'))

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Landing />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="book" element={<BookPage />} />
          <Route path="booking/confirmation/:id" element={<RequireRole><ConfirmationPage /></RequireRole>} />
          <Route path="my-bookings" element={<RequireRole><MyBookingsPage /></RequireRole>} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin" element={<RequireRole roles={['Admin', 'Staff']}><AdminLayout /></RequireRole>}>
          <Route index element={<RequireRole roles={['Admin']} fallback="/admin/calendar"><OverviewPage /></RequireRole>} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="services" element={<RequireRole roles={['Admin']}><AdminServicesPage /></RequireRole>} />
          <Route path="staff" element={<RequireRole roles={['Admin']}><AdminStaffPage /></RequireRole>} />
          <Route path="time-off" element={<RequireRole roles={['Admin']}><TimeOffPage /></RequireRole>} />
          <Route path="reports" element={<RequireRole roles={['Admin']}><ReportsPage /></RequireRole>} />
          <Route path="settings" element={<RequireRole roles={['Admin']}><SettingsPage /></RequireRole>} />
          <Route path="audit" element={<RequireRole roles={['Admin']}><AuditPage /></RequireRole>} />
        </Route>
      </Routes>
    </Suspense>
  )
}
