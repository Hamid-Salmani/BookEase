using System.Linq.Expressions;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;

namespace BookEase.Application;

public static class Mappings {
  public static readonly Expression<Func<Booking, BookingDto>> BookingProjection = b => new BookingDto(
    b.Id, b.Reference, b.Status,
    b.ServiceId, b.Service.Name, b.StaffId, b.Staff.Name,
    b.CustomerId, b.Customer.FullName, b.Customer.Email,
    b.StartUtc, b.EndUtc, b.PriceCents, b.Currency, b.Notes,
    b.ExpiresAtUtc, b.CancelledAtUtc, b.CancellationReason,
    b.Payment != null ? b.Payment.Status : (PaymentStatus?)null,
    b.Payment != null ? b.Payment.RefundedCents : 0);

  public static readonly Expression<Func<TimeOff, TimeOffDto>> TimeOffProjection = t => new TimeOffDto(t.Id, t.StaffId, t.Staff.Name, t.StartUtc, t.EndUtc, t.Reason);

  public static BusinessDto ToDto(this Business b) => new(b.Name, b.Description, b.TimeZoneId, b.Currency, b.ContactEmail, b.CancellationWindowHours, b.MinNoticeMinutes, b.MaxAdvanceDays, b.SlotStepMinutes);

  public static UserDto ToDto(this User u) => new(u.Id, u.Email, u.FullName, u.Phone, u.Role);

  public static ServiceDto ToDto(this Service s, IEnumerable<Guid> staffIds) => new(s.Id, s.Name, s.Description, s.DurationMinutes, s.BufferMinutes, s.PriceCents, s.IsActive, staffIds.ToList());

  public static StaffDto ToDto(this Staff s) => new(s.Id, s.Name, s.Title, s.Bio, s.IsActive, s.StaffServices.Select(x => x.ServiceId).ToList());

  public static WorkingHoursDto ToDto(this WorkingHours w) => new(w.DayOfWeek, w.StartTime, w.EndTime);
}
