export type Role = 'Customer' | 'Admin' | 'Staff'
export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed' | 'NoShow'
export type PaymentStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Refunded'

export interface User { id: string; email: string; fullName: string; phone?: string | null; role: Role }
export interface AuthResponse { accessToken: string; refreshToken: string; accessTokenExpiresAt: string; user: User }
export interface Business {
  name: string; description?: string | null; timeZoneId: string; currency: string; contactEmail: string
  cancellationWindowHours: number; minNoticeMinutes: number; maxAdvanceDays: number; slotStepMinutes: number
}
export interface PublicConfig { stripePublishableKey?: string | null; demoPayments: boolean }
export interface Service {
  id: string; name: string; description: string; durationMinutes: number; bufferMinutes: number
  priceCents: number; isActive: boolean; staffIds: string[]
  /** Not sent by the API today; used when present. */
  imageUrl?: string | null; category?: string | null
}
export interface Staff { id: string; name: string; title: string; bio?: string | null; isActive: boolean; serviceIds: string[] }
export interface WorkingHours { dayOfWeek: number; startTime: string; endTime: string }
export interface TimeOff { id: string; staffId: string; staffName: string; startUtc: string; endUtc: string; reason?: string | null }
export interface Slot { startUtc: string; endUtc: string; staffIds: string[] }
export interface Availability { date: string; timeZoneId: string; slots: Slot[] }
export interface MonthAvailability { month: string; timeZoneId: string; days: { date: string; hasSlots: boolean }[] }
export interface Booking {
  id: string; reference: string; status: BookingStatus
  serviceId: string; serviceName: string; staffId: string; staffName: string
  customerId: string; customerName: string; customerEmail: string
  startUtc: string; endUtc: string; priceCents: number; currency: string; notes?: string | null
  expiresAtUtc?: string | null; cancelledAtUtc?: string | null; cancellationReason?: string | null
  paymentStatus?: PaymentStatus | null; refundedCents: number
}
export interface PaymentIntentInfo { paymentIntentId: string; clientSecret: string; amountCents: number; currency: string }
export interface CreateBookingResponse { booking: Booking; payment?: PaymentIntentInfo | null }
export interface CancellationQuote { withinFreeWindow: boolean; refundCents: number; freeUntilUtc: string }
export interface Paged<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }
export interface Calendar { fromUtc: string; toUtc: string; timeZoneId: string; bookings: Booking[]; timeOff: TimeOff[] }
export interface Overview {
  todayBookings: number; upcomingBookings: number; pendingBookings: number; revenueThisMonthCents: number
  newCustomersThisMonth: number; completedThisMonth: number; noShowRate: number; currency: string; nextBookings: Booking[]
}
export interface Reports {
  from: string; to: string; currency: string
  revenue: { date: string; revenueCents: number; bookings: number }[]
  topServices: { serviceId: string; name: string; bookings: number; revenueCents: number }[]
  busiestHours: { hour: number; bookings: number }[]
}
export interface AuditLog { id: string; createdAt: string; userEmail?: string | null; action: string; entityName: string; entityId?: string | null; details?: string | null }
