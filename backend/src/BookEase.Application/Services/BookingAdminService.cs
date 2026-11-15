using System.Globalization;
using System.Text;
using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class BookingAdminService(IAppDbContext db, IPaymentService payments, IEmailService emails, IAuditService audit, ICurrentUser user, IClock clock) : IBookingAdminService {
  public async Task<PagedResult<BookingDto>> ListAsync(AdminBookingQuery query, CancellationToken ct) {
    var bookings = await FilterAsync(query, ct);
    return await bookings.Select(Mappings.BookingProjection).ToPagedAsync(query.Page, query.PageSize, ct);
  }

  public async Task<CalendarDto> GetCalendarAsync(CalendarQuery query, CancellationToken ct) {
    var now = clock.UtcNow;
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var isWeek = query.View == "week";
    var first = isWeek ? query.Date.AddDays(-(((int)query.Date.DayOfWeek + 6) % 7)) : query.Date;
    var from = TimeHelper.StartOfDayUtc(first, zone);
    var to = TimeHelper.StartOfDayUtc(first.AddDays(isWeek ? 7 : 1), zone);
    var staffId = await ScopedStaffIdAsync(query.StaffId, ct);
    var bookings = db.Bookings.AsNoTracking()
      .Where(b => b.StartUtc < to && b.EndUtc > from
        && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Completed || b.Status == BookingStatus.NoShow || (b.Status == BookingStatus.Pending && b.ExpiresAtUtc > now)));
    var timeOff = db.TimeOffs.AsNoTracking().Where(t => t.StartUtc < to && t.EndUtc > from);
    if (staffId != null) {
      bookings = bookings.Where(b => b.StaffId == staffId);
      timeOff = timeOff.Where(t => t.StaffId == staffId);
    }
    var bookingDtos = await bookings.OrderBy(b => b.StartUtc).Select(Mappings.BookingProjection).ToListAsync(ct);
    var timeOffDtos = await timeOff.OrderBy(t => t.StartUtc).Select(Mappings.TimeOffProjection).ToListAsync(ct);
    return new CalendarDto(from, to, business.TimeZoneId, bookingDtos, timeOffDtos);
  }

  public async Task<ExportFile> ExportCsvAsync(AdminBookingQuery query, CancellationToken ct) {
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var bookings = await FilterAsync(query, ct);
    var rows = await bookings.Take(10_000).Select(Mappings.BookingProjection).ToListAsync(ct);
    var csv = new StringBuilder();
    csv.AppendLine("Reference,Status,Service,Staff,Customer,Email,Start,End,Price,Currency,Payment,Refunded,Created notes");
    foreach (var b in rows) {
      var cells = new[] {
        b.Reference, b.Status.ToString(), b.ServiceName, b.StaffName, b.CustomerName, b.CustomerEmail,
        TimeHelper.ToLocal(b.StartUtc, zone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        TimeHelper.ToLocal(b.EndUtc, zone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        (b.PriceCents / 100m).ToString("0.00", CultureInfo.InvariantCulture), b.Currency.ToUpperInvariant(),
        b.PaymentStatus?.ToString() ?? "None", (b.RefundedCents / 100m).ToString("0.00", CultureInfo.InvariantCulture),
        b.Notes ?? string.Empty,
      };
      csv.AppendLine(string.Join(',', cells.Select(Escape)));
    }
    var bytes = new UTF8Encoding(true).GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
    return new ExportFile(bytes, $"bookings-{clock.UtcNow:yyyyMMdd-HHmm}.csv", "text/csv");
  }

  public async Task<BookingDto> ConfirmAsync(Guid id, CancellationToken ct) {
    var booking = await LoadAsync(id, ct);
    booking.Confirm();
    audit.Record("booking.confirmed", nameof(Booking), id.ToString(), "Confirmed manually");
    await db.SaveChangesAsync(ct);
    await emails.QueueBookingEmailAsync(BookingEmailEvent.Confirmed, id, ct);
    return await GetDtoAsync(id, ct);
  }

  public async Task<BookingDto> CompleteAsync(Guid id, CancellationToken ct) {
    var booking = await LoadAsync(id, ct);
    booking.Complete(clock.UtcNow);
    audit.Record("booking.completed", nameof(Booking), id.ToString());
    await db.SaveChangesAsync(ct);
    return await GetDtoAsync(id, ct);
  }

  public async Task<BookingDto> NoShowAsync(Guid id, CancellationToken ct) {
    var booking = await LoadAsync(id, ct);
    booking.MarkNoShow(clock.UtcNow);
    audit.Record("booking.no-show", nameof(Booking), id.ToString());
    await db.SaveChangesAsync(ct);
    return await GetDtoAsync(id, ct);
  }

  public async Task<BookingDto> CancelAsync(Guid id, AdminCancelRequest request, CancellationToken ct) {
    var booking = await LoadAsync(id, ct);
    booking.Cancel(request.Reason?.Trim(), clock.UtcNow);
    var refunded = request.Refund && await payments.RefundBookingAsync(booking, ct);
    audit.Record("booking.cancelled", nameof(Booking), id.ToString(), refunded ? "Cancelled by staff, refunded" : "Cancelled by staff");
    await db.SaveChangesAsync(ct);
    await emails.QueueBookingEmailAsync(BookingEmailEvent.Cancelled, id, ct);
    return await GetDtoAsync(id, ct);
  }

  private async Task<IQueryable<Booking>> FilterAsync(AdminBookingQuery query, CancellationToken ct) {
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var bookings = db.Bookings.AsNoTracking().AsQueryable();
    var staffId = await ScopedStaffIdAsync(query.StaffId, ct);
    if (staffId != null) {
      bookings = bookings.Where(b => b.StaffId == staffId);
    }
    if (query.Status != null) {
      bookings = bookings.Where(b => b.Status == query.Status);
    }
    if (query.ServiceId != null) {
      bookings = bookings.Where(b => b.ServiceId == query.ServiceId);
    }
    if (query.From != null) {
      var from = TimeHelper.StartOfDayUtc(query.From.Value, zone);
      bookings = bookings.Where(b => b.StartUtc >= from);
    }
    if (query.To != null) {
      var to = TimeHelper.StartOfDayUtc(query.To.Value.AddDays(1), zone);
      bookings = bookings.Where(b => b.StartUtc < to);
    }
    if (string.IsNullOrWhiteSpace(query.Search) == false) {
      var term = query.Search.Trim().ToLower();
      bookings = bookings.Where(b => b.Reference.ToLower().Contains(term)
        || b.Customer.FullName.ToLower().Contains(term)
        || b.Customer.Email.ToLower().Contains(term)
        || b.Service.Name.ToLower().Contains(term)
        || b.Staff.Name.ToLower().Contains(term));
    }
    var desc = query.Sort == null || query.Desc;
    return query.Sort?.ToLowerInvariant() switch {
      "created" => bookings.OrderByDirection(b => b.CreatedAt, desc),
      "price" => bookings.OrderByDirection(b => b.PriceCents, desc),
      "status" => bookings.OrderByDirection(b => b.Status, desc),
      "customer" => bookings.OrderByDirection(b => b.Customer.FullName, desc),
      "service" => bookings.OrderByDirection(b => b.Service.Name, desc),
      _ => bookings.OrderByDirection(b => b.StartUtc, desc),
    };
  }

  private async Task<Guid?> ScopedStaffIdAsync(Guid? requested, CancellationToken ct) {
    if (user.Role != UserRole.Staff) {
      return requested;
    }
    var userId = user.UserId;
    var own = await db.StaffMembers.AsNoTracking().Where(s => s.UserId == userId).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
    return own ?? throw new ForbiddenException("Your account is not linked to a staff profile.");
  }

  private async Task<Booking> LoadAsync(Guid id, CancellationToken ct) {
    var booking = await db.Bookings.Include(b => b.Payment).FirstOrDefaultAsync(b => b.Id == id, ct)
      ?? throw new NotFoundException("Booking not found.");
    var staffId = await ScopedStaffIdAsync(null, ct);
    if (staffId != null && booking.StaffId != staffId) {
      throw new NotFoundException("Booking not found.");
    }
    return booking;
  }

  private async Task<BookingDto> GetDtoAsync(Guid id, CancellationToken ct) =>
    await db.Bookings.AsNoTracking().Where(b => b.Id == id).Select(Mappings.BookingProjection).FirstAsync(ct);

  private static string Escape(string value) {
    var safe = value.Length > 0 && "=+-@\t\r".Contains(value[0]) ? "'" + value : value;
    return safe.Contains(',') || safe.Contains('"') || safe.Contains('\n') || safe.Contains('\r')
      ? "\"" + safe.Replace("\"", "\"\"") + "\""
      : safe;
  }
}
