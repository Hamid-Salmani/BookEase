using BookEase.Domain.Common;

namespace BookEase.Domain.Entities;

public class Service : BaseEntity {
  public string Name { get; set; } = string.Empty;
  public string Description { get; set; } = string.Empty;
  public int DurationMinutes { get; set; }
  public int BufferMinutes { get; set; }
  public int PriceCents { get; set; }
  public bool IsActive { get; set; } = true;
  public List<StaffService> StaffServices { get; set; } = [];
}
