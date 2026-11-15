using System.Security.Cryptography;
using BookEase.Domain.Common;
using BookEase.Domain.Enums;

namespace BookEase.Domain.Entities;

public class Booking : BaseEntity {
  public string Reference { get; set; } = NewReference();
  public Guid CustomerId { get; set; }
  public User Customer { get; set; } = null!;
  public Guid ServiceId { get; set; }
  public Service Service { get; set; } = null!;
  public Guid StaffId { get; set; }
  public Staff Staff { get; set; } = null!;
  public DateTime StartUtc { get; set; }
  public DateTime EndUtc { get; set; }
  public DateTime BlockedUntilUtc { get; set; }
  public BookingStatus Status { get; set; } = BookingStatus.Pending;
  public DateTime? ExpiresAtUtc { get; set; }
  public string? Notes { get; set; }
  public int PriceCents { get; set; }
  public string Currency { get; set; } = "usd";
  public DateTime? CancelledAtUtc { get; set; }
  public string? CancellationReason { get; set; }
  public DateTime? ReminderSentAtUtc { get; set; }
  public Payment? Payment { get; set; }

  public bool IsActive => Status is BookingStatus.Pending or BookingStatus.Confirmed;

  public bool HoldsSlot(DateTime now) => Status == BookingStatus.Confirmed || (Status == BookingStatus.Pending && ExpiresAtUtc > now);

  public void SetTimes(DateTime startUtc, int durationMinutes, int bufferMinutes) {
    StartUtc = startUtc;
    EndUtc = startUtc.AddMinutes(durationMinutes);
    BlockedUntilUtc = EndUtc.AddMinutes(bufferMinutes);
  }

  public void Confirm() {
    if (Status != BookingStatus.Pending) {
      throw new DomainException($"Only pending bookings can be confirmed (current status: {Status}).");
    }
    Status = BookingStatus.Confirmed;
    ExpiresAtUtc = null;
  }

  public void Cancel(string? reason, DateTime now) {
    if (IsActive == false) {
      throw new DomainException($"A {Status} booking cannot be cancelled.");
    }
    Status = BookingStatus.Cancelled;
    CancelledAtUtc = now;
    CancellationReason = reason;
    ExpiresAtUtc = null;
  }

  public void Expire(DateTime now) {
    if (Status != BookingStatus.Pending) {
      return;
    }
    Status = BookingStatus.Cancelled;
    CancelledAtUtc = now;
    CancellationReason = "Payment window expired";
    ExpiresAtUtc = null;
  }

  public void Complete(DateTime now) {
    if (Status != BookingStatus.Confirmed) {
      throw new DomainException("Only confirmed bookings can be completed.");
    }
    if (StartUtc > now) {
      throw new DomainException("A booking cannot be completed before it starts.");
    }
    Status = BookingStatus.Completed;
  }

  public void MarkNoShow(DateTime now) {
    if (Status != BookingStatus.Confirmed) {
      throw new DomainException("Only confirmed bookings can be marked as no-show.");
    }
    if (StartUtc > now) {
      throw new DomainException("A booking cannot be a no-show before it starts.");
    }
    Status = BookingStatus.NoShow;
  }

  public static string NewReference() {
    const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var chars = new char[6];
    for (var i = 0; i < chars.Length; i++) {
      chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
    }
    return "BE-" + new string(chars);
  }
}
