using BookEase.Application.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BookEase.Infrastructure.BackgroundJobs;

public abstract class PeriodicWorker(IServiceScopeFactory scopes, ILogger logger, TimeSpan interval) : BackgroundService {
  protected ILogger Logger { get; } = logger;

  protected abstract Task RunAsync(IServiceProvider services, CancellationToken ct);

  protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
    using (var scope = scopes.CreateScope()) {
      if (scope.ServiceProvider.GetRequiredService<IConfiguration>().GetValue("BackgroundJobs:Enabled", true) == false) {
        return;
      }
    }
    using var timer = new PeriodicTimer(interval);
    try {
      do {
        try {
          using var scope = scopes.CreateScope();
          await RunAsync(scope.ServiceProvider, stoppingToken);
        } catch (Exception ex) when (ex is not OperationCanceledException) {
          Logger.LogError(ex, "Background job {Job} failed", GetType().Name);
        }
      } while (await timer.WaitForNextTickAsync(stoppingToken));
    } catch (OperationCanceledException) {
      // shutting down
    }
  }
}

public class BookingExpiryWorker(IServiceScopeFactory scopes, ILogger<BookingExpiryWorker> logger) : PeriodicWorker(scopes, logger, TimeSpan.FromSeconds(30)) {
  protected override async Task RunAsync(IServiceProvider services, CancellationToken ct) {
    var expired = await services.GetRequiredService<IMaintenanceService>().ExpirePendingAsync(ct);
    if (expired > 0) {
      Logger.LogInformation("Expired {Count} unpaid pending bookings", expired);
    }
  }
}

public class ReminderWorker(IServiceScopeFactory scopes, ILogger<ReminderWorker> logger) : PeriodicWorker(scopes, logger, TimeSpan.FromMinutes(5)) {
  protected override async Task RunAsync(IServiceProvider services, CancellationToken ct) {
    var queued = await services.GetRequiredService<IMaintenanceService>().QueueRemindersAsync(ct);
    if (queued > 0) {
      Logger.LogInformation("Queued {Count} appointment reminders", queued);
    }
  }
}

public class EmailWorker(IServiceScopeFactory scopes, ILogger<EmailWorker> logger) : PeriodicWorker(scopes, logger, TimeSpan.FromSeconds(5)) {
  protected override async Task RunAsync(IServiceProvider services, CancellationToken ct) {
    var sent = await services.GetRequiredService<IEmailDispatcher>().DispatchPendingAsync(ct);
    if (sent > 0) {
      Logger.LogInformation("Sent {Count} emails", sent);
    }
  }
}
