using BookEase.Application.Abstractions;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using BookEase.Infrastructure.Persistence;
using BookEase.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BookEase.Tests;

public class EmailQueueTests(BookEaseFactory factory) : IClassFixture<BookEaseFactory> {
  [Fact]
  public async Task Failed_sends_are_retried_with_backoff_and_eventually_marked_failed() {
    var id = await factory.WithScopeAsync(async sp => {
      var db = sp.GetRequiredService<AppDbContext>();
      var message = new EmailMessage { ToAddress = "customer@demo.com", Subject = "Retry me", HtmlBody = "<p>Hi</p>" };
      db.EmailMessages.Add(message);
      await db.SaveChangesAsync();
      return message.Id;
    });
    factory.Emails.Fail = true;
    try {
      for (var attempt = 1; attempt <= 5; attempt++) {
        await factory.WithScopeAsync(sp => sp.GetRequiredService<IEmailDispatcher>().DispatchPendingAsync(CancellationToken.None));
        var state = await Load(id);
        state.Attempts.Should().Be(attempt);
        if (attempt < 5) {
          state.Status.Should().Be(EmailStatus.Pending);
          state.NextAttemptAtUtc.Should().BeAfter(DateTime.UtcNow);
          state.LastError.Should().Contain("SMTP is down");
          await factory.WithScopeAsync(async sp => await sp.GetRequiredService<AppDbContext>().EmailMessages
            .Where(m => m.Id == id).ExecuteUpdateAsync(s => s.SetProperty(m => m.NextAttemptAtUtc, DateTime.UtcNow.AddSeconds(-1))));
        }
      }
      (await Load(id)).Status.Should().Be(EmailStatus.Failed);
    } finally {
      factory.Emails.Fail = false;
    }
  }

  [Fact]
  public async Task Pending_emails_are_delivered_when_the_sender_recovers() {
    await factory.WithScopeAsync(async sp => {
      var db = sp.GetRequiredService<AppDbContext>();
      db.EmailMessages.Add(new EmailMessage { ToAddress = "recovered@example.com", Subject = "Recovered", HtmlBody = "<p>Hi</p>" });
      return await db.SaveChangesAsync();
    });

    var sent = await factory.WithScopeAsync(sp => sp.GetRequiredService<IEmailDispatcher>().DispatchPendingAsync(CancellationToken.None));

    sent.Should().BeGreaterThanOrEqualTo(1);
    factory.Emails.Sent.Should().Contain(e => e.To == "recovered@example.com");
  }

  private Task<EmailMessage> Load(Guid id) => factory.WithScopeAsync(async sp =>
    await sp.GetRequiredService<AppDbContext>().EmailMessages.AsNoTracking().FirstAsync(m => m.Id == id));
}
