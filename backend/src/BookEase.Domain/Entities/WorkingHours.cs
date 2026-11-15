using BookEase.Domain.Common;

namespace BookEase.Domain.Entities;

public class WorkingHours : BaseEntity {
  public Guid StaffId { get; set; }
  public Staff Staff { get; set; } = null!;
  public DayOfWeek DayOfWeek { get; set; }
  public TimeOnly StartTime { get; set; }
  public TimeOnly EndTime { get; set; }
}
