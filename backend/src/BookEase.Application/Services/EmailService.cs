using BookEase.Application.Abstractions;
using BookEase.Application.Options;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookEase.Application.Services;

public class EmailService(IAppDbContext db, IClock clock, IOptions<AppOptions> appOptions) : IEmailService {
  public async Task QueueBookingEmailAsync(BookingEmailEvent kind, Guid bookingId, CancellationToken ct) {
    var booking = await db.Bookings.AsNoTracking()
      .Include(b => b.Customer).Include(b => b.Service).Include(b => b.Staff).Include(b => b.Payment)
      .FirstOrDefaultAsync(b => b.Id == bookingId, ct);
    if (booking == null) {
      return;
    }
    var business = await db.Businesses.AsNoTracking().FirstAsync(ct);
    var frontendUrl = appOptions.Value.FrontendUrl;
    var customerMail = EmailTemplates.ForCustomer(kind, booking, business, frontendUrl);
    db.EmailMessages.Add(NewMessage(booking.Customer.Email, customerMail));
    if (kind != BookingEmailEvent.Reminder) {
      var adminMail = EmailTemplates.ForAdmin(kind, booking, business, frontendUrl);
      db.EmailMessages.Add(NewMessage(business.ContactEmail, adminMail));
    }
    await db.SaveChangesAsync(ct);
  }

  private EmailMessage NewMessage(string to, RenderedEmail mail) => new() {
    ToAddress = to,
    Subject = mail.Subject,
    HtmlBody = mail.Html,
    NextAttemptAtUtc = clock.UtcNow,
    CreatedAt = clock.UtcNow,
  };
}

public class EmailDispatcher(IAppDbContext db, IEmailSender sender, IClock clock, ILogger<EmailDispatcher> logger) : IEmailDispatcher {
  public const int MaxAttempts = 5;

  public async Task<int> DispatchPendingAsync(CancellationToken ct) {
    var now = clock.UtcNow;
    var batch = await db.EmailMessages
      .Where(m => m.Status == EmailStatus.Pending && m.NextAttemptAtUtc <= now)
      .OrderBy(m => m.CreatedAt)
      .Take(20)
      .ToListAsync(ct);
    var sent = 0;
    foreach (var message in batch) {
      try {
        await sender.SendAsync(message.ToAddress, message.Subject, message.HtmlBody, ct);
        message.Status = EmailStatus.Sent;
        message.SentAtUtc = clock.UtcNow;
        message.LastError = null;
        sent++;
      } catch (Exception ex) when (ex is not OperationCanceledException) {
        message.Attempts++;
        message.LastError = ex.GetType().Name + ": " + Truncate(ex.Message, 300);
        if (message.Attempts >= MaxAttempts) {
          message.Status = EmailStatus.Failed;
          logger.LogError("Email {EmailId} permanently failed after {Attempts} attempts", message.Id, message.Attempts);
        } else {
          message.NextAttemptAtUtc = clock.UtcNow.AddSeconds(30 * Math.Pow(2, message.Attempts - 1));
          logger.LogWarning("Email {EmailId} failed (attempt {Attempts}), will retry", message.Id, message.Attempts);
        }
      }
      await db.SaveChangesAsync(ct);
    }
    return sent;
  }

  private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
