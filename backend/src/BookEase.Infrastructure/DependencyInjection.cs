using BookEase.Application.Abstractions;
using BookEase.Application.Options;
using BookEase.Infrastructure.BackgroundJobs;
using BookEase.Infrastructure.Common;
using BookEase.Infrastructure.Email;
using BookEase.Infrastructure.Payments;
using BookEase.Infrastructure.Persistence;
using BookEase.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookEase.Infrastructure;

public static class DependencyInjection {
  public static IServiceCollection AddInfrastructure(this IServiceCollection services) {
    services.AddDbContext<AppDbContext>((sp, options) => {
      var config = sp.GetRequiredService<IConfiguration>();
      var connectionString = config.GetConnectionString("Default") ?? "Data Source=bookease.db;Default Timeout=30";
      if (string.Equals(config["Database:Provider"], "Postgres", StringComparison.OrdinalIgnoreCase)) {
        options.UseNpgsql(connectionString);
      } else {
        options.UseSqlite(connectionString);
      }
    });
    services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
    services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.Section).Validate(o => o.Key.Length >= 32, "Jwt:Key must be at least 32 characters.").ValidateOnStart();
    services.AddOptions<StripeOptions>().BindConfiguration(StripeOptions.Section);
    services.AddOptions<SmtpOptions>().BindConfiguration(SmtpOptions.Section);
    services.AddOptions<BookingOptions>().BindConfiguration(BookingOptions.Section);
    services.AddOptions<AppOptions>().BindConfiguration(AppOptions.Section);
    services.AddSingleton<IClock, SystemClock>();
    services.AddSingleton<IBookingLock, KeyedBookingLock>();
    services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
    services.AddSingleton<ITokenService, JwtTokenService>();
    services.AddSingleton<IEmailSender, MailKitEmailSender>();
    services.AddSingleton<IPaymentGateway>(sp => {
      var config = sp.GetRequiredService<IConfiguration>();
      if (string.IsNullOrWhiteSpace(config["Stripe:SecretKey"]) == false) {
        return ActivatorUtilities.CreateInstance<StripePaymentGateway>(sp);
      }
      if (config.GetValue("Payments:AllowDemo", false) == false) {
        throw new InvalidOperationException("Stripe:SecretKey is not configured. Set it, or enable Payments:AllowDemo for local demos.");
      }
      sp.GetRequiredService<ILoggerFactory>().CreateLogger("Payments").LogWarning("Stripe is not configured: running with the DEMO payment gateway.");
      return new DemoPaymentGateway();
    });
    return services;
  }

  public static IServiceCollection AddBackgroundJobs(this IServiceCollection services) =>
    services.AddHostedService<BookingExpiryWorker>().AddHostedService<ReminderWorker>().AddHostedService<EmailWorker>();
}
