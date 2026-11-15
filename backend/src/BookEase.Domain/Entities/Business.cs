using BookEase.Domain.Common;

namespace BookEase.Domain.Entities;

public class Business : BaseEntity {
  public string Name { get; set; } = string.Empty;
  public string? Description { get; set; }
  public string TimeZoneId { get; set; } = "UTC";
  public string Currency { get; set; } = "usd";
  public string ContactEmail { get; set; } = string.Empty;
  public int CancellationWindowHours { get; set; } = 24;
  public int MinNoticeMinutes { get; set; } = 60;
  public int MaxAdvanceDays { get; set; } = 60;
  public int SlotStepMinutes { get; set; } = 30;
}
