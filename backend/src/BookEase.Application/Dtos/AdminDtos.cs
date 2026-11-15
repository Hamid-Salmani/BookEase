namespace BookEase.Application.Dtos;

public record OverviewDto(int TodayBookings, int UpcomingBookings, int PendingBookings, int RevenueThisMonthCents, int NewCustomersThisMonth, int CompletedThisMonth, double NoShowRate, string Currency, IReadOnlyList<BookingDto> NextBookings);
public record ReportQuery(DateOnly? From, DateOnly? To);
public record RevenuePoint(DateOnly Date, int RevenueCents, int Bookings);
public record TopServicePoint(Guid ServiceId, string Name, int Bookings, int RevenueCents);
public record HourPoint(int Hour, int Bookings);
public record ReportsDto(DateOnly From, DateOnly To, string Currency, IReadOnlyList<RevenuePoint> Revenue, IReadOnlyList<TopServicePoint> TopServices, IReadOnlyList<HourPoint> BusiestHours);
public record AuditLogDto(Guid Id, DateTime CreatedAt, string? UserEmail, string Action, string EntityName, string? EntityId, string? Details);
