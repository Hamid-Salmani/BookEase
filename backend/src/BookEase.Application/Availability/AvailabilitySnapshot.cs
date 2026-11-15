using BookEase.Application.Common;
using BookEase.Domain.Entities;

namespace BookEase.Application.Availability;

public class AvailabilitySnapshot(
  Business business,
  Service service,
  IReadOnlyList<Staff> staff,
  IReadOnlyList<(Guid StaffId, Interval Range)> blocked,
  DateTime now) {
  public Business Business { get; } = business;
  public Service Service { get; } = service;
  public IReadOnlyList<Staff> Staff { get; } = staff;
  public TimeZoneInfo Zone { get; } = TimeHelper.Zone(business.TimeZoneId);
  public IReadOnlyList<Guid> StaffIds => Staff.Select(s => s.Id).ToList();

  public IReadOnlyList<(Guid StaffId, Interval Slot)> Compute(DateOnly date) {
    var today = TimeHelper.LocalDate(now, Zone);
    if (date < today || date > today.AddDays(Business.MaxAdvanceDays)) {
      return [];
    }
    var earliest = now.AddMinutes(Business.MinNoticeMinutes);
    var result = new List<(Guid, Interval)>();
    foreach (var member in Staff) {
      var windows = member.WorkingHours
        .Where(w => w.DayOfWeek == date.DayOfWeek)
        .Select(w => new Interval(TimeHelper.LocalToUtc(date, w.StartTime, Zone), TimeHelper.LocalToUtc(date, w.EndTime, Zone)))
        .ToList();
      if (windows.Count == 0) {
        continue;
      }
      var blockedForStaff = blocked.Where(b => b.StaffId == member.Id).Select(b => b.Range).ToList();
      foreach (var slot in SlotCalculator.Calculate(windows, blockedForStaff, Service.DurationMinutes, Service.BufferMinutes, Business.SlotStepMinutes, earliest)) {
        result.Add((member.Id, slot));
      }
    }
    return result;
  }

  public bool IsAvailable(Guid staffId, DateTime startUtc) {
    var date = TimeHelper.LocalDate(startUtc, Zone);
    return Compute(date).Any(s => s.StaffId == staffId && s.Slot.Start == startUtc);
  }
}
