using BookEase.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookEase.Infrastructure.Persistence;

public class UserConfiguration : IEntityTypeConfiguration<User> {
  public void Configure(EntityTypeBuilder<User> b) {
    b.HasIndex(u => u.Email).IsUnique();
    b.Property(u => u.Email).HasMaxLength(254).IsRequired();
    b.Property(u => u.PasswordHash).HasMaxLength(300).IsRequired();
    b.Property(u => u.FullName).HasMaxLength(100).IsRequired();
    b.Property(u => u.Phone).HasMaxLength(30);
  }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken> {
  public void Configure(EntityTypeBuilder<RefreshToken> b) {
    b.HasIndex(t => t.TokenHash).IsUnique();
    b.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
    b.Property(t => t.ReplacedByHash).HasMaxLength(128);
    b.HasOne(t => t.User).WithMany(u => u.RefreshTokens).HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
  }
}

public class BusinessConfiguration : IEntityTypeConfiguration<Business> {
  public void Configure(EntityTypeBuilder<Business> b) {
    b.Property(x => x.Name).HasMaxLength(100).IsRequired();
    b.Property(x => x.Description).HasMaxLength(1000);
    b.Property(x => x.TimeZoneId).HasMaxLength(64).IsRequired();
    b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
    b.Property(x => x.ContactEmail).HasMaxLength(254).IsRequired();
  }
}

public class ServiceConfiguration : IEntityTypeConfiguration<Service> {
  public void Configure(EntityTypeBuilder<Service> b) {
    b.Property(s => s.Name).HasMaxLength(100).IsRequired();
    b.Property(s => s.Description).HasMaxLength(1000).IsRequired();
  }
}

public class StaffConfiguration : IEntityTypeConfiguration<Staff> {
  public void Configure(EntityTypeBuilder<Staff> b) {
    b.Property(s => s.Name).HasMaxLength(100).IsRequired();
    b.Property(s => s.Title).HasMaxLength(100).IsRequired();
    b.Property(s => s.Bio).HasMaxLength(1000);
    b.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.SetNull);
  }
}

public class StaffServiceConfiguration : IEntityTypeConfiguration<StaffService> {
  public void Configure(EntityTypeBuilder<StaffService> b) {
    b.HasKey(x => new { x.StaffId, x.ServiceId });
    b.HasOne(x => x.Staff).WithMany(s => s.StaffServices).HasForeignKey(x => x.StaffId).OnDelete(DeleteBehavior.Cascade);
    b.HasOne(x => x.Service).WithMany(s => s.StaffServices).HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
  }
}

public class WorkingHoursConfiguration : IEntityTypeConfiguration<WorkingHours> {
  public void Configure(EntityTypeBuilder<WorkingHours> b) {
    b.HasIndex(w => new { w.StaffId, w.DayOfWeek });
    b.HasOne(w => w.Staff).WithMany(s => s.WorkingHours).HasForeignKey(w => w.StaffId).OnDelete(DeleteBehavior.Cascade);
  }
}

public class TimeOffConfiguration : IEntityTypeConfiguration<TimeOff> {
  public void Configure(EntityTypeBuilder<TimeOff> b) {
    b.HasIndex(t => new { t.StaffId, t.StartUtc });
    b.Property(t => t.Reason).HasMaxLength(200);
    b.HasOne(t => t.Staff).WithMany(s => s.TimeOffs).HasForeignKey(t => t.StaffId).OnDelete(DeleteBehavior.Cascade);
  }
}

public class BookingConfiguration : IEntityTypeConfiguration<Booking> {
  public void Configure(EntityTypeBuilder<Booking> b) {
    b.HasIndex(x => x.Reference).IsUnique();
    b.Property(x => x.Reference).HasMaxLength(16).IsRequired();
    b.Property(x => x.Notes).HasMaxLength(500);
    b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
    b.Property(x => x.CancellationReason).HasMaxLength(300);
    // DB-level double-booking guard: only one active (Pending=0 / Confirmed=1) booking may start at the same instant for a staff member.
    b.HasIndex(x => new { x.StaffId, x.StartUtc }).IsUnique().HasFilter("\"Status\" IN (0, 1)");
    b.HasIndex(x => new { x.CustomerId, x.StartUtc });
    b.HasIndex(x => new { x.Status, x.ExpiresAtUtc });
    b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.Service).WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.Staff).WithMany().HasForeignKey(x => x.StaffId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.Payment).WithOne(p => p.Booking).HasForeignKey<Payment>(p => p.BookingId).OnDelete(DeleteBehavior.Cascade);
  }
}

public class PaymentConfiguration : IEntityTypeConfiguration<Payment> {
  public void Configure(EntityTypeBuilder<Payment> b) {
    b.HasIndex(p => p.PaymentIntentId).IsUnique();
    b.Property(p => p.PaymentIntentId).HasMaxLength(100).IsRequired();
    b.Property(p => p.Currency).HasMaxLength(3).IsRequired();
  }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog> {
  public void Configure(EntityTypeBuilder<AuditLog> b) {
    b.HasIndex(a => a.CreatedAt);
    b.Property(a => a.UserEmail).HasMaxLength(254);
    b.Property(a => a.Action).HasMaxLength(80).IsRequired();
    b.Property(a => a.EntityName).HasMaxLength(80).IsRequired();
    b.Property(a => a.EntityId).HasMaxLength(80);
    b.Property(a => a.Details).HasMaxLength(500);
  }
}

public class EmailMessageConfiguration : IEntityTypeConfiguration<EmailMessage> {
  public void Configure(EntityTypeBuilder<EmailMessage> b) {
    b.HasIndex(m => new { m.Status, m.NextAttemptAtUtc });
    b.Property(m => m.ToAddress).HasMaxLength(254).IsRequired();
    b.Property(m => m.Subject).HasMaxLength(300).IsRequired();
    b.Property(m => m.LastError).HasMaxLength(400);
  }
}

public class ProcessedWebhookEventConfiguration : IEntityTypeConfiguration<ProcessedWebhookEvent> {
  public void Configure(EntityTypeBuilder<ProcessedWebhookEvent> b) {
    b.HasKey(e => e.EventId);
    b.Property(e => e.EventId).HasMaxLength(100);
  }
}
