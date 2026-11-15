namespace BookEase.Application.Common;

public static class TimeHelper {
  public static DateTime AsUtc(DateTime value) => value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);

  public static TimeZoneInfo Zone(string id) => TimeZoneInfo.FindSystemTimeZoneById(id);

  public static DateTime LocalToUtc(DateOnly date, TimeOnly time, TimeZoneInfo tz) {
    var local = date.ToDateTime(time, DateTimeKind.Unspecified);
    if (tz.IsInvalidTime(local)) {
      local = local.AddHours(1);
    }
    return DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeToUtc(local, tz), DateTimeKind.Utc);
  }

  public static DateTime StartOfDayUtc(DateOnly date, TimeZoneInfo tz) => LocalToUtc(date, TimeOnly.MinValue, tz);

  public static DateTime ToLocal(DateTime utc, TimeZoneInfo tz) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), tz);

  public static DateOnly LocalDate(DateTime utc, TimeZoneInfo tz) => DateOnly.FromDateTime(ToLocal(utc, tz));
}
