using BookEase.Domain.Common;
using BookEase.Domain.Enums;

namespace BookEase.Domain.Entities;

public class Payment : BaseEntity {
  public Guid BookingId { get; set; }
  public Booking Booking { get; set; } = null!;
  public string PaymentIntentId { get; set; } = string.Empty;
  public int AmountCents { get; set; }
  public string Currency { get; set; } = "usd";
  public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
  public int RefundedCents { get; set; }
  public DateTime? PaidAtUtc { get; set; }
}
