using BookEase.Domain.Common;

namespace BookEase.Domain.Entities;

public class Staff : BaseEntity {
  public Guid? UserId { get; set; }
  public User? User { get; set; }
  public string Name { get; set; } = string.Empty;
  public string Title { get; set; } = string.Empty;
  public string? Bio { get; set; }
  public bool IsActive { get; set; } = true;
  public List<StaffService> StaffServices { get; set; } = [];
  public List<WorkingHours> WorkingHours { get; set; } = [];
  public List<TimeOff> TimeOffs { get; set; } = [];
}
