namespace BookEase.Application.Availability;

public record Interval(DateTime Start, DateTime End);

public static class SlotCalculator {
  public static IReadOnlyList<Interval> Calculate(
    IEnumerable<Interval> workWindows,
    IReadOnlyCollection<Interval> blocked,
    int durationMinutes,
    int bufferMinutes,
    int stepMinutes,
    DateTime earliestStartUtc) {
    var slots = new List<Interval>();
    var duration = TimeSpan.FromMinutes(durationMinutes);
    var occupied = TimeSpan.FromMinutes(durationMinutes + bufferMinutes);
    var step = TimeSpan.FromMinutes(Math.Max(stepMinutes, 5));
    foreach (var window in workWindows.OrderBy(w => w.Start)) {
      for (var start = window.Start; start + duration <= window.End; start += step) {
        if (start < earliestStartUtc) {
          continue;
        }
        var occupiedEnd = start + occupied;
        if (blocked.Any(b => b.Start < occupiedEnd && start < b.End)) {
          continue;
        }
        slots.Add(new Interval(start, start + duration));
      }
    }
    return slots;
  }
}
