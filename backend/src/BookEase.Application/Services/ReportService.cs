using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class ReportService(IAppDbContext db, IClock clock) : IReportService {
  public async Task<OverviewDto> GetOverviewAsync(CancellationToken ct) {
    var now = clock.UtcNow;
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var today = TimeHelper.LocalDate(now, zone);
    var dayStart = TimeHelper.StartOfDayUtc(today, zone);
    var dayEnd = TimeHelper.StartOfDayUtc(today.AddDays(1), zone);
    var monthStart = TimeHelper.StartOfDayUtc(new DateOnly(today.Year, today.Month, 1), zone);
    var weekAhead = now.AddDays(7);
    var thirtyDaysAgo = now.AddDays(-30);
    var bookings = db.Bookings.AsNoTracking();
    var todayCount = await bookings.CountAsync(b => b.StartUtc >= dayStart && b.StartUtc < dayEnd && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Completed), ct);
    var upcoming = await bookings.CountAsync(b => b.Status == BookingStatus.Confirmed && b.StartUtc > now && b.StartUtc <= weekAhead, ct);
    var pending = await bookings.CountAsync(b => b.Status == BookingStatus.Pending && b.ExpiresAtUtc > now, ct);
    var revenue = await db.Payments.AsNoTracking()
      .Where(p => p.Status == PaymentStatus.Succeeded && p.PaidAtUtc >= monthStart)
      .SumAsync(p => (int?)(p.AmountCents - p.RefundedCents), ct) ?? 0;
    var newCustomers = await db.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Customer && u.CreatedAt >= monthStart, ct);
    var completedMonth = await bookings.CountAsync(b => b.Status == BookingStatus.Completed && b.StartUtc >= monthStart && b.StartUtc < now, ct);
    var completed30 = await bookings.CountAsync(b => b.Status == BookingStatus.Completed && b.StartUtc >= thirtyDaysAgo, ct);
    var noShow30 = await bookings.CountAsync(b => b.Status == BookingStatus.NoShow && b.StartUtc >= thirtyDaysAgo, ct);
    var noShowRate = completed30 + noShow30 == 0 ? 0 : Math.Round(noShow30 / (double)(completed30 + noShow30), 3);
    var next = await bookings.Where(b => b.Status == BookingStatus.Confirmed && b.StartUtc > now)
      .OrderBy(b => b.StartUtc).Take(5).Select(Mappings.BookingProjection).ToListAsync(ct);
    return new OverviewDto(todayCount, upcoming, pending, revenue, newCustomers, completedMonth, noShowRate, business.Currency, next);
  }

  public async Task<ReportsDto> GetReportsAsync(ReportQuery query, CancellationToken ct) {
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var to = query.To ?? TimeHelper.LocalDate(clock.UtcNow, zone);
    var from = query.From ?? to.AddDays(-29);
    var fromUtc = TimeHelper.StartOfDayUtc(from, zone);
    var toUtc = TimeHelper.StartOfDayUtc(to.AddDays(1), zone);

    var payments = await db.Payments.AsNoTracking()
      .Where(p => p.Status == PaymentStatus.Succeeded && p.PaidAtUtc >= fromUtc && p.PaidAtUtc < toUtc)
      .Select(p => new { p.PaidAtUtc, Net = p.AmountCents - p.RefundedCents })
      .ToListAsync(ct);
    var byDay = payments
      .GroupBy(p => TimeHelper.LocalDate(p.PaidAtUtc!.Value, zone))
      .ToDictionary(g => g.Key, g => (Revenue: g.Sum(x => x.Net), Count: g.Count()));
    var revenue = new List<RevenuePoint>();
    for (var day = from; day <= to; day = day.AddDays(1)) {
      var (sum, count) = byDay.GetValueOrDefault(day);
      revenue.Add(new RevenuePoint(day, sum, count));
    }

    var counted = db.Bookings.AsNoTracking()
      .Where(b => b.StartUtc >= fromUtc && b.StartUtc < toUtc && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Completed));
    var top = await counted
      .GroupBy(b => new { b.ServiceId, b.Service.Name })
      .Select(g => new TopServicePoint(g.Key.ServiceId, g.Key.Name, g.Count(), g.Sum(x => x.PriceCents)))
      .ToListAsync(ct);
    var topServices = top.OrderByDescending(t => t.Bookings).ThenByDescending(t => t.RevenueCents).Take(8).ToList();

    var starts = await counted.Select(b => b.StartUtc).ToListAsync(ct);
    var hourCounts = starts.GroupBy(s => TimeHelper.ToLocal(s, zone).Hour).ToDictionary(g => g.Key, g => g.Count());
    var hours = new List<HourPoint>();
    if (hourCounts.Count > 0) {
      for (var hour = hourCounts.Keys.Min(); hour <= hourCounts.Keys.Max(); hour++) {
        hours.Add(new HourPoint(hour, hourCounts.GetValueOrDefault(hour)));
      }
    }
    return new ReportsDto(from, to, business.Currency, revenue, topServices, hours);
  }
}
