namespace BookEase.Domain.Entities;

public class ProcessedWebhookEvent {
  public string EventId { get; set; } = string.Empty;
  public DateTime ProcessedAtUtc { get; set; } = DateTime.UtcNow;
}
