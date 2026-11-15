using BookEase.Application.Abstractions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BookEase.Tests.Infrastructure;

public class CapturingEmailSender : IEmailSender {
  private readonly List<(string To, string Subject)> _sent = [];

  public bool Fail { get; set; }

  public IReadOnlyList<(string To, string Subject)> Sent {
    get {
      lock (_sent) {
        return _sent.ToList();
      }
    }
  }

  public Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct) {
    if (Fail) {
      throw new InvalidOperationException("SMTP is down");
    }
    lock (_sent) {
      _sent.Add((to, subject));
    }
    return Task.CompletedTask;
  }
}

public class BookEaseFactory : WebApplicationFactory<Program> {
  private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"bookease-test-{Guid.NewGuid():N}.db");

  public int AuthPermitLimit { get; init; } = 1000;

  public CapturingEmailSender Emails { get; } = new();

  protected override void ConfigureWebHost(IWebHostBuilder builder) {
    builder.UseEnvironment("Testing");
    builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> {
      ["ConnectionStrings:Default"] = $"Data Source={_dbPath};Default Timeout=30",
      ["Jwt:Key"] = "test-signing-key-test-signing-key-1234567890",
      ["Seed:Enabled"] = "true",
      ["Payments:AllowDemo"] = "true",
      ["BackgroundJobs:Enabled"] = "false",
      ["RateLimiting:AuthPermitLimit"] = AuthPermitLimit.ToString(),
      ["Serilog:MinimumLevel:Default"] = "Warning",
    }));
    builder.ConfigureTestServices(services => {
      services.RemoveAll<IEmailSender>();
      services.AddSingleton<IEmailSender>(Emails);
    });
  }

  public async Task<T> WithScopeAsync<T>(Func<IServiceProvider, Task<T>> action) {
    using var scope = Services.CreateScope();
    return await action(scope.ServiceProvider);
  }

  protected override void Dispose(bool disposing) {
    base.Dispose(disposing);
    SqliteConnection.ClearAllPools();
    foreach (var file in new[] { _dbPath, _dbPath + "-wal", _dbPath + "-shm" }) {
      if (File.Exists(file)) {
        File.Delete(file);
      }
    }
  }
}
