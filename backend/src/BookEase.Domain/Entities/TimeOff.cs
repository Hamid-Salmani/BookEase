using BookEase.Domain.Common;

namespace BookEase.Domain.Entities;

public class TimeOff : BaseEntity {
  public Guid StaffId { get; set; }
  public Staff Staff { get; set; } = null!;
  public DateTime StartUtc { get; set; }
  public DateTime EndUtc { get; set; }
  public string? Reason { get; set; }
}
