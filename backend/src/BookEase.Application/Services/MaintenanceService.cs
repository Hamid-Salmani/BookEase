using BookEase.Application.Abstractions;
using BookEase.Application.Options;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BookEase.Application.Services;

public class MaintenanceService(IAppDbContext db, IEmailService emails, IClock clock, IOptions<BookingOptions> options) : IMaintenanceService {
  public async Task<int> ExpirePendingAsync(CancellationToken ct) {
    var now = clock.UtcNow;
    return await db.Bookings
      .Where(b => b.Status == BookingStatus.Pending && b.ExpiresAtUtc <= now)
      .ExecuteUpdateAsync(s => s
        .SetProperty(b => b.Status, BookingStatus.Cancelled)
        .SetProperty(b => b.CancelledAtUtc, now)
        .SetProperty(b => b.CancellationReason, "Payment window expired")
        .SetProperty(b => b.ExpiresAtUtc, (DateTime?)null), ct);
  }

  public async Task<int> QueueRemindersAsync(CancellationToken ct) {
    var now = clock.UtcNow;
    var until = now.AddHours(options.Value.ReminderHoursBefore);
    var due = await db.Bookings
      .Where(b => b.Status == BookingStatus.Confirmed && b.ReminderSentAtUtc == null && b.StartUtc > now && b.StartUtc <= until)
      .ToListAsync(ct);
    foreach (var booking in due) {
      await emails.QueueBookingEmailAsync(BookingEmailEvent.Reminder, booking.Id, ct);
      booking.ReminderSentAtUtc = now;
      await db.SaveChangesAsync(ct);
    }
    return due.Count;
  }
}
