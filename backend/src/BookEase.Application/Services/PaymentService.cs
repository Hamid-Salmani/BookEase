using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookEase.Application.Services;

public class PaymentService(IAppDbContext db, IPaymentGateway gateway, IEmailService emails, IAuditService audit, IClock clock, ILogger<PaymentService> logger) : IPaymentService {
  public async Task HandleWebhookAsync(string payload, string signatureHeader, CancellationToken ct) {
    var gatewayEvent = gateway.ParseWebhook(payload, signatureHeader);
    await HandleEventAsync(gatewayEvent, ct);
  }

  public async Task HandleEventAsync(GatewayEvent gatewayEvent, CancellationToken ct) {
    if (gatewayEvent.Type == GatewayEventType.Ignored || string.IsNullOrEmpty(gatewayEvent.PaymentIntentId)) {
      return;
    }
    if (await db.ProcessedWebhookEvents.AnyAsync(e => e.EventId == gatewayEvent.EventId, ct)) {
      logger.LogInformation("Webhook event {EventId} already processed", gatewayEvent.EventId);
      return;
    }
    var now = clock.UtcNow;
    db.ProcessedWebhookEvents.Add(new ProcessedWebhookEvent { EventId = gatewayEvent.EventId, ProcessedAtUtc = now });
    var payment = await db.Payments.Include(p => p.Booking).FirstOrDefaultAsync(p => p.PaymentIntentId == gatewayEvent.PaymentIntentId, ct);
    if (payment == null) {
      logger.LogWarning("Webhook event {EventId} references an unknown payment intent", gatewayEvent.EventId);
      await db.SaveChangesAsync(ct);
      return;
    }
    var confirmed = false;
    if (gatewayEvent.Type == GatewayEventType.PaymentSucceeded) {
      confirmed = await ApplySuccessAsync(payment, now, ct);
    } else if (payment.Status == PaymentStatus.Pending) {
      payment.Status = PaymentStatus.Failed;
      audit.Record("payment.failed", nameof(Payment), payment.Id.ToString(), payment.Booking.Reference);
    }
    await db.SaveChangesAsync(ct);
    if (confirmed) {
      await emails.QueueBookingEmailAsync(BookingEmailEvent.Confirmed, payment.BookingId, ct);
    }
  }

  public Task SimulateSuccessAsync(string paymentIntentId, CancellationToken ct) {
    if (gateway.IsDemo == false) {
      throw new NotFoundException("Not found.");
    }
    return HandleEventAsync(new GatewayEvent("evt_demo_" + Guid.NewGuid().ToString("N"), GatewayEventType.PaymentSucceeded, paymentIntentId), ct);
  }

  public async Task<bool> RefundBookingAsync(Booking booking, CancellationToken ct) {
    var payment = booking.Payment ?? await db.Payments.FirstOrDefaultAsync(p => p.BookingId == booking.Id, ct);
    if (payment == null || payment.Status != PaymentStatus.Succeeded) {
      return false;
    }
    await RefundPaymentAsync(payment, ct);
    audit.Record("payment.refunded", nameof(Payment), payment.Id.ToString(), $"{payment.RefundedCents} {payment.Currency}");
    return true;
  }

  private async Task<bool> ApplySuccessAsync(Payment payment, DateTime now, CancellationToken ct) {
    if (payment.Status is PaymentStatus.Succeeded or PaymentStatus.Refunded) {
      return false;
    }
    payment.Status = PaymentStatus.Succeeded;
    payment.PaidAtUtc = now;
    var booking = payment.Booking;
    if (booking.Status == BookingStatus.Pending) {
      booking.Confirm();
      audit.Record("booking.confirmed", nameof(Booking), booking.Id.ToString(), "Payment received");
      return true;
    }
    if (booking.Status == BookingStatus.Cancelled) {
      await RefundPaymentAsync(payment, ct);
      audit.Record("payment.auto-refunded", nameof(Payment), payment.Id.ToString(), "Paid after the booking was cancelled or expired");
    }
    return false;
  }

  private async Task RefundPaymentAsync(Payment payment, CancellationToken ct) {
    var amount = payment.AmountCents - payment.RefundedCents;
    if (amount <= 0) {
      return;
    }
    await gateway.RefundAsync(payment.PaymentIntentId, amount, ct);
    payment.RefundedCents += amount;
    payment.Status = PaymentStatus.Refunded;
  }
}
