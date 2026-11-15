using BookEase.Domain.Common;
using BookEase.Domain.Enums;

namespace BookEase.Domain.Entities;

public class EmailMessage : BaseEntity {
  public string ToAddress { get; set; } = string.Empty;
  public string Subject { get; set; } = string.Empty;
  public string HtmlBody { get; set; } = string.Empty;
  public EmailStatus Status { get; set; } = EmailStatus.Pending;
  public int Attempts { get; set; }
  public DateTime NextAttemptAtUtc { get; set; } = DateTime.UtcNow;
  public string? LastError { get; set; }
  public DateTime? SentAtUtc { get; set; }
}
