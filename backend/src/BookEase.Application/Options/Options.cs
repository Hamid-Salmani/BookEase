namespace BookEase.Application.Options;

public class BookingOptions {
  public const string Section = "Booking";
  public int HoldMinutes { get; set; } = 10;
  public int ReminderHoursBefore { get; set; } = 24;
}

public class AppOptions {
  public const string Section = "App";
  public string FrontendUrl { get; set; } = "http://localhost:5173";
}
