using BookEase.Application.Common;
using BookEase.Domain.Enums;

namespace BookEase.Application.Dtos;

public record BookingDto(
  Guid Id, string Reference, BookingStatus Status,
  Guid ServiceId, string ServiceName, Guid StaffId, string StaffName,
  Guid CustomerId, string CustomerName, string CustomerEmail,
  DateTime StartUtc, DateTime EndUtc, int PriceCents, string Currency, string? Notes,
  DateTime? ExpiresAtUtc, DateTime? CancelledAtUtc, string? CancellationReason,
  PaymentStatus? PaymentStatus, int RefundedCents);

public record CreateBookingRequest(Guid ServiceId, Guid? StaffId, DateTime StartUtc, string? Notes);
public record PaymentIntentDto(string PaymentIntentId, string ClientSecret, int AmountCents, string Currency);
public record CreateBookingResponse(BookingDto Booking, PaymentIntentDto? Payment);
public record CancelBookingRequest(string? Reason);
public record RescheduleRequest(DateTime StartUtc, Guid? StaffId);
public record CancellationQuoteDto(bool WithinFreeWindow, int RefundCents, DateTime FreeUntilUtc);

public class MyBookingsQuery : PageQuery {
  public BookingStatus? Status { get; set; }
  public bool? Upcoming { get; set; }
}

public class AdminBookingQuery : PageQuery {
  public BookingStatus? Status { get; set; }
  public Guid? StaffId { get; set; }
  public Guid? ServiceId { get; set; }
  public DateOnly? From { get; set; }
  public DateOnly? To { get; set; }
}

public record AdminCancelRequest(string? Reason, bool Refund);
public record CalendarQuery(DateOnly Date, string View, Guid? StaffId);
public record CalendarDto(DateTime FromUtc, DateTime ToUtc, string TimeZoneId, IReadOnlyList<BookingDto> Bookings, IReadOnlyList<TimeOffDto> TimeOff);
public record ExportFile(byte[] Content, string FileName, string ContentType);
