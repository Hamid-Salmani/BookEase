using BookEase.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BookEase.Infrastructure.Persistence;

public static class DatabaseInitializer {
  public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default) {
    using var scope = services.CreateScope();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseInitializer");
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (config.GetValue("Database:MigrateOnStartup", true)) {
      if (db.Database.IsSqlite()) {
        await db.Database.MigrateAsync(ct);
        await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;", ct);
      } else {
        await db.Database.EnsureCreatedAsync(ct);
      }
    }
    if (config.GetValue("Seed:Enabled", false)) {
      var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
      var clock = scope.ServiceProvider.GetRequiredService<IClock>();
      await DbSeeder.SeedAsync(db, hasher, clock.UtcNow, ct);
      logger.LogInformation("Seed data ensured");
    }
  }
}
