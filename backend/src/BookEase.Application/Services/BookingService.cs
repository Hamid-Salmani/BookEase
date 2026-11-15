using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Application.Options;
using BookEase.Domain.Common;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookEase.Application.Services;

public class BookingService(
  IAppDbContext db,
  IAvailabilityService availability,
  IBookingLock bookingLock,
  IPaymentGateway gateway,
  IPaymentService payments,
  IEmailService emails,
  IAuditService audit,
  ICurrentUser user,
  IClock clock,
  IOptions<BookingOptions> options,
  ILogger<BookingService> logger) : IBookingService {
  public async Task<CreateBookingResponse> CreateAsync(CreateBookingRequest request, CancellationToken ct) {
    var now = clock.UtcNow;
    var startUtc = TimeHelper.AsUtc(request.StartUtc);
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var date = TimeHelper.LocalDate(startUtc, TimeHelper.Zone(business.TimeZoneId));
    var probe = await availability.LoadSnapshotAsync(request.ServiceId, request.StaffId, date, date, null, ct);
    if (request.StaffId != null && probe.Staff.Count == 0) {
      throw new BadRequestException("The selected staff member does not offer this service.");
    }
    var candidates = probe.Compute(date).Where(s => s.Slot.Start == startUtc).Select(s => s.StaffId).ToList();
    if (candidates.Count == 0) {
      throw new SlotUnavailableException();
    }
    Booking? booking = null;
    foreach (var staffId in candidates) {
      booking = await TryCreateAsync(staffId, probe.Service, business, startUtc, request.Notes, ct);
      if (booking != null) {
        break;
      }
    }
    if (booking == null) {
      throw new SlotUnavailableException();
    }
    return await FinalizeAsync(booking, now, ct);
  }

  public async Task<PagedResult<BookingDto>> ListMineAsync(MyBookingsQuery query, CancellationToken ct) {
    var now = clock.UtcNow;
    var userId = user.UserId;
    var bookings = db.Bookings.AsNoTracking()
      .Where(b => b.CustomerId == userId && (b.Status != BookingStatus.Pending || b.ExpiresAtUtc > now));
    if (query.Status != null) {
      bookings = bookings.Where(b => b.Status == query.Status);
    }
    if (query.Upcoming == true) {
      bookings = bookings.Where(b => b.EndUtc >= now && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed));
    } else if (query.Upcoming == false) {
      bookings = bookings.Where(b => b.EndUtc < now || (b.Status != BookingStatus.Pending && b.Status != BookingStatus.Confirmed));
    }
    bookings = bookings.OrderByDirection(b => b.StartUtc, query.Desc);
    return await bookings.Select(Mappings.BookingProjection).ToPagedAsync(query.Page, query.PageSize, ct);
  }

  public async Task<BookingDto> GetAsync(Guid id, CancellationToken ct) {
    var dto = await GetDtoAsync(id, ct);
    if (dto.CustomerId != user.UserId && user.Role != UserRole.Admin) {
      throw new NotFoundException("Booking not found.");
    }
    return dto;
  }

  public async Task<CancellationQuoteDto> GetCancellationQuoteAsync(Guid id, CancellationToken ct) {
    var booking = await LoadOwnedAsync(id, ct);
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var freeUntil = booking.StartUtc.AddHours(-business.CancellationWindowHours);
    var within = clock.UtcNow <= freeUntil;
    var refundable = within && booking.Payment is { Status: PaymentStatus.Succeeded } payment ? payment.AmountCents - payment.RefundedCents : 0;
    return new CancellationQuoteDto(within, refundable, freeUntil);
  }

  public async Task<BookingDto> CancelAsync(Guid id, CancelBookingRequest request, CancellationToken ct) {
    var now = clock.UtcNow;
    var booking = await LoadOwnedAsync(id, ct);
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    if (booking.IsActive && booking.StartUtc <= now) {
      throw new DomainException("Bookings that have already started cannot be cancelled online.");
    }
    var withinFreeWindow = now <= booking.StartUtc.AddHours(-business.CancellationWindowHours);
    booking.Cancel(request.Reason?.Trim(), now);
    var refunded = withinFreeWindow && await payments.RefundBookingAsync(booking, ct);
    audit.Record("booking.cancelled", nameof(Booking), id.ToString(), refunded ? "Refunded" : "No refund");
    await db.SaveChangesAsync(ct);
    await QueueEmailAsync(BookingEmailEvent.Cancelled, id, ct);
    return await GetDtoAsync(id, ct);
  }

  public async Task<BookingDto> RescheduleAsync(Guid id, RescheduleRequest request, CancellationToken ct) {
    var now = clock.UtcNow;
    var booking = await LoadOwnedAsync(id, ct);
    if (booking.IsActive == false) {
      throw new DomainException($"A {booking.Status} booking cannot be rescheduled.");
    }
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    if (now > booking.StartUtc.AddHours(-business.CancellationWindowHours)) {
      throw new DomainException($"Bookings can only be rescheduled up to {business.CancellationWindowHours} hours before they start.");
    }
    var startUtc = TimeHelper.AsUtc(request.StartUtc);
    var staffId = request.StaffId ?? booking.StaffId;
    var date = TimeHelper.LocalDate(startUtc, TimeHelper.Zone(business.TimeZoneId));
    using (await bookingLock.AcquireAsync(staffId, ct)) {
      await using var tx = await db.Database.BeginTransactionAsync(ct);
      await ExpireStalePendingAsync(staffId, now, ct);
      var snapshot = await availability.LoadSnapshotAsync(booking.ServiceId, staffId, date, date, booking.Id, ct);
      if (snapshot.IsAvailable(staffId, startUtc) == false) {
        throw new SlotUnavailableException();
      }
      booking.StaffId = staffId;
      booking.SetTimes(startUtc, snapshot.Service.DurationMinutes, snapshot.Service.BufferMinutes);
      booking.ReminderSentAtUtc = null;
      audit.Record("booking.rescheduled", nameof(Booking), id.ToString());
      try {
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
      } catch (DbUpdateException) {
        throw new SlotUnavailableException();
      }
    }
    await QueueEmailAsync(BookingEmailEvent.Rescheduled, id, ct);
    return await GetDtoAsync(id, ct);
  }

  private async Task<Booking?> TryCreateAsync(Guid staffId, Service service, Business business, DateTime startUtc, string? notes, CancellationToken ct) {
    var now = clock.UtcNow;
    var date = TimeHelper.LocalDate(startUtc, TimeHelper.Zone(business.TimeZoneId));
    using var slotLock = await bookingLock.AcquireAsync(staffId, ct);
    await using var tx = await db.Database.BeginTransactionAsync(ct);
    await ExpireStalePendingAsync(staffId, now, ct);
    var snapshot = await availability.LoadSnapshotAsync(service.Id, staffId, date, date, null, ct);
    if (snapshot.IsAvailable(staffId, startUtc) == false) {
      return null;
    }
    var booking = new Booking {
      CustomerId = user.UserId,
      ServiceId = service.Id,
      StaffId = staffId,
      Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
      PriceCents = service.PriceCents,
      Currency = business.Currency,
      Status = BookingStatus.Pending,
      ExpiresAtUtc = now.AddMinutes(options.Value.HoldMinutes),
      CreatedAt = now,
    };
    booking.SetTimes(startUtc, service.DurationMinutes, service.BufferMinutes);
    db.Bookings.Add(booking);
    try {
      await db.SaveChangesAsync(ct);
      await tx.CommitAsync(ct);
      return booking;
    } catch (DbUpdateException ex) {
      logger.LogInformation(ex, "Booking insert rejected by the database, treating the slot as taken");
      db.Bookings.Remove(booking);
      return null;
    }
  }

  private async Task<CreateBookingResponse> FinalizeAsync(Booking booking, DateTime now, CancellationToken ct) {
    if (booking.PriceCents <= 0) {
      booking.Confirm();
      audit.Record("booking.created", nameof(Booking), booking.Id.ToString(), "Free booking confirmed");
      await db.SaveChangesAsync(ct);
      await QueueEmailAsync(BookingEmailEvent.Confirmed, booking.Id, ct);
      return new CreateBookingResponse(await GetDtoAsync(booking.Id, ct), null);
    }
    PaymentIntentResult intent;
    try {
      intent = await gateway.CreatePaymentIntentAsync(booking.Id, booking.Reference, booking.PriceCents, booking.Currency, user.Email ?? string.Empty, ct);
    } catch (PaymentGatewayException) {
      booking.Cancel("Payment could not be initialised", now);
      await db.SaveChangesAsync(ct);
      throw;
    }
    db.Payments.Add(new Payment { BookingId = booking.Id, PaymentIntentId = intent.IntentId, AmountCents = booking.PriceCents, Currency = booking.Currency });
    audit.Record("booking.created", nameof(Booking), booking.Id.ToString(), "Awaiting payment");
    await db.SaveChangesAsync(ct);
    return new CreateBookingResponse(
      await GetDtoAsync(booking.Id, ct),
      new PaymentIntentDto(intent.IntentId, intent.ClientSecret, booking.PriceCents, booking.Currency));
  }

  private Task<int> ExpireStalePendingAsync(Guid staffId, DateTime now, CancellationToken ct) =>
    db.Bookings
      .Where(b => b.StaffId == staffId && b.Status == BookingStatus.Pending && b.ExpiresAtUtc <= now)
      .ExecuteUpdateAsync(s => s
        .SetProperty(b => b.Status, BookingStatus.Cancelled)
        .SetProperty(b => b.CancelledAtUtc, now)
        .SetProperty(b => b.CancellationReason, "Payment window expired")
        .SetProperty(b => b.ExpiresAtUtc, (DateTime?)null), ct);

  private async Task<Booking> LoadOwnedAsync(Guid id, CancellationToken ct) {
    var userId = user.UserId;
    var isAdmin = user.Role == UserRole.Admin;
    return await db.Bookings.Include(b => b.Payment).FirstOrDefaultAsync(b => b.Id == id && (isAdmin || b.CustomerId == userId), ct)
      ?? throw new NotFoundException("Booking not found.");
  }

  private async Task<BookingDto> GetDtoAsync(Guid id, CancellationToken ct) =>
    await db.Bookings.AsNoTracking().Where(b => b.Id == id).Select(Mappings.BookingProjection).FirstOrDefaultAsync(ct)
      ?? throw new NotFoundException("Booking not found.");

  private async Task QueueEmailAsync(BookingEmailEvent kind, Guid bookingId, CancellationToken ct) {
    try {
      await emails.QueueBookingEmailAsync(kind, bookingId, ct);
    } catch (Exception ex) when (ex is not OperationCanceledException) {
      logger.LogError(ex, "Failed to queue {Kind} email for booking {BookingId}", kind, bookingId);
    }
  }
}
