using System.Globalization;
using BookEase.Application.Abstractions;
using BookEase.Application.Availability;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class AvailabilityService(IAppDbContext db, IClock clock) : IAvailabilityService {
  public async Task<AvailabilityDto> GetSlotsAsync(AvailabilityQuery query, CancellationToken ct) {
    var snapshot = await LoadSnapshotAsync(query.ServiceId, query.StaffId, query.Date, query.Date, null, ct);
    var slots = snapshot.Compute(query.Date)
      .GroupBy(s => s.Slot.Start)
      .OrderBy(g => g.Key)
      .Select(g => new SlotDto(g.Key, g.First().Slot.End, g.Select(x => x.StaffId).ToList()))
      .ToList();
    return new AvailabilityDto(query.Date, snapshot.Business.TimeZoneId, slots);
  }

  public async Task<MonthAvailabilityDto> GetMonthAsync(MonthAvailabilityQuery query, CancellationToken ct) {
    var first = DateOnly.ParseExact(query.Month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);
    var last = first.AddMonths(1).AddDays(-1);
    var snapshot = await LoadSnapshotAsync(query.ServiceId, query.StaffId, first, last, null, ct);
    var days = new List<DayAvailabilityDto>();
    for (var date = first; date <= last; date = date.AddDays(1)) {
      days.Add(new DayAvailabilityDto(date, snapshot.Compute(date).Count > 0));
    }
    return new MonthAvailabilityDto(query.Month, snapshot.Business.TimeZoneId, days);
  }

  public async Task<AvailabilitySnapshot> LoadSnapshotAsync(Guid serviceId, Guid? staffId, DateOnly from, DateOnly to, Guid? excludeBookingId, CancellationToken ct) {
    var now = clock.UtcNow;
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var service = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == serviceId && s.IsActive, ct)
      ?? throw new NotFoundException("Service not found.");
    var staffQuery = db.StaffMembers.AsNoTracking().Include(s => s.WorkingHours)
      .Where(s => s.IsActive && s.StaffServices.Any(x => x.ServiceId == serviceId));
    if (staffId != null) {
      staffQuery = staffQuery.Where(s => s.Id == staffId);
    }
    var staff = await staffQuery.OrderBy(s => s.Name).ToListAsync(ct);
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var fromUtc = TimeHelper.StartOfDayUtc(from, zone);
    var toUtc = TimeHelper.StartOfDayUtc(to.AddDays(1), zone);
    var ids = staff.Select(s => s.Id).ToList();
    var bookings = await db.Bookings.AsNoTracking()
      .Where(b => ids.Contains(b.StaffId) && b.Id != excludeBookingId && b.StartUtc < toUtc && b.BlockedUntilUtc > fromUtc
        && (b.Status == BookingStatus.Confirmed || (b.Status == BookingStatus.Pending && b.ExpiresAtUtc > now)))
      .Select(b => new { b.StaffId, b.StartUtc, b.BlockedUntilUtc })
      .ToListAsync(ct);
    var timeOff = await db.TimeOffs.AsNoTracking()
      .Where(t => ids.Contains(t.StaffId) && t.StartUtc < toUtc && t.EndUtc > fromUtc)
      .Select(t => new { t.StaffId, t.StartUtc, t.EndUtc })
      .ToListAsync(ct);
    var blocked = bookings.Select(b => (b.StaffId, new Interval(b.StartUtc, b.BlockedUntilUtc)))
      .Concat(timeOff.Select(t => (t.StaffId, new Interval(t.StartUtc, t.EndUtc))))
      .ToList();
    return new AvailabilitySnapshot(business, service, staff, blocked, now);
  }
}
