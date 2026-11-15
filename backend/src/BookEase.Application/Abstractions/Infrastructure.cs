using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace BookEase.Application.Abstractions;

public interface IAppDbContext {
  DbSet<User> Users { get; }
  DbSet<RefreshToken> RefreshTokens { get; }
  DbSet<Business> Businesses { get; }
  DbSet<Service> Services { get; }
  DbSet<Staff> StaffMembers { get; }
  DbSet<StaffService> StaffServices { get; }
  DbSet<WorkingHours> WorkingHours { get; }
  DbSet<TimeOff> TimeOffs { get; }
  DbSet<Booking> Bookings { get; }
  DbSet<Payment> Payments { get; }
  DbSet<AuditLog> AuditLogs { get; }
  DbSet<EmailMessage> EmailMessages { get; }
  DbSet<ProcessedWebhookEvent> ProcessedWebhookEvents { get; }
  DatabaseFacade Database { get; }
  Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IClock {
  DateTime UtcNow { get; }
}

public interface IBookingLock {
  Task<IDisposable> AcquireAsync(Guid staffId, CancellationToken ct);
}

public interface IPasswordHasher {
  string Hash(string password);
  bool Verify(string hash, string password);
}

public record AccessTokenResult(string Token, DateTime ExpiresAtUtc);

public interface ITokenService {
  AccessTokenResult CreateAccessToken(User user);
  string GenerateRefreshToken();
  string Hash(string token);
  TimeSpan RefreshTokenLifetime { get; }
}

public interface ICurrentUser {
  bool IsAuthenticated { get; }
  Guid? UserIdOrNull { get; }
  Guid UserId { get; }
  UserRole Role { get; }
  string? Email { get; }
}

public record PaymentIntentResult(string IntentId, string ClientSecret);

public enum GatewayEventType { PaymentSucceeded, PaymentFailed, Ignored }

public record GatewayEvent(string EventId, GatewayEventType Type, string? PaymentIntentId);

public interface IPaymentGateway {
  bool IsDemo { get; }
  string? PublishableKey { get; }
  Task<PaymentIntentResult> CreatePaymentIntentAsync(Guid bookingId, string reference, int amountCents, string currency, string customerEmail, CancellationToken ct);
  Task RefundAsync(string paymentIntentId, int amountCents, CancellationToken ct);
  GatewayEvent ParseWebhook(string payload, string signatureHeader);
}

public interface IEmailSender {
  Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct);
}
