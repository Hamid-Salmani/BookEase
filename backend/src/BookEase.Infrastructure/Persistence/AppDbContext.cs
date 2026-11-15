using BookEase.Application.Abstractions;
using BookEase.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BookEase.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext {
  public DbSet<User> Users => Set<User>();
  public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
  public DbSet<Business> Businesses => Set<Business>();
  public DbSet<Service> Services => Set<Service>();
  public DbSet<Staff> StaffMembers => Set<Staff>();
  public DbSet<StaffService> StaffServices => Set<StaffService>();
  public DbSet<WorkingHours> WorkingHours => Set<WorkingHours>();
  public DbSet<TimeOff> TimeOffs => Set<TimeOff>();
  public DbSet<Booking> Bookings => Set<Booking>();
  public DbSet<Payment> Payments => Set<Payment>();
  public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
  public DbSet<EmailMessage> EmailMessages => Set<EmailMessage>();
  public DbSet<ProcessedWebhookEvent> ProcessedWebhookEvents => Set<ProcessedWebhookEvent>();

  protected override void OnModelCreating(ModelBuilder modelBuilder) =>
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

  protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder) {
    configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
  }
}

public class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
  v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc),
  v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

public class NullableUtcDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
  v => v.HasValue ? (v.Value.Kind == DateTimeKind.Local ? v.Value.ToUniversalTime() : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)) : v,
  v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
