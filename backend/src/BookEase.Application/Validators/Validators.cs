using BookEase.Application.Common;
using BookEase.Application.Dtos;
using FluentValidation;

namespace BookEase.Application.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest> {
  public RegisterRequestValidator() {
    RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
    RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128)
      .Matches("[A-Za-z]").WithMessage("Password must contain a letter.")
      .Matches("[0-9]").WithMessage("Password must contain a digit.");
    RuleFor(x => x.FullName).NotEmpty().MinimumLength(2).MaximumLength(100);
    RuleFor(x => x.Phone).MaximumLength(30).Matches(@"^[0-9+()\-\s.]*$").When(x => string.IsNullOrEmpty(x.Phone) == false);
  }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest> {
  public LoginRequestValidator() {
    RuleFor(x => x.Email).NotEmpty().MaximumLength(254);
    RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
  }
}

public class RefreshRequestValidator : AbstractValidator<RefreshRequest> {
  public RefreshRequestValidator() => RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(512);
}

public class UpsertServiceRequestValidator : AbstractValidator<UpsertServiceRequest> {
  public UpsertServiceRequestValidator() {
    RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    RuleFor(x => x.Description).NotNull().MaximumLength(1000);
    RuleFor(x => x.DurationMinutes).InclusiveBetween(5, 480);
    RuleFor(x => x.BufferMinutes).InclusiveBetween(0, 120);
    RuleFor(x => x.PriceCents).InclusiveBetween(0, 10_000_000);
  }
}

public class UpsertStaffRequestValidator : AbstractValidator<UpsertStaffRequest> {
  public UpsertStaffRequestValidator() {
    RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    RuleFor(x => x.Title).NotNull().MaximumLength(100);
    RuleFor(x => x.Bio).MaximumLength(1000);
    RuleFor(x => x.ServiceIds).NotNull().Must(ids => ids.Count <= 100);
  }
}

public class ReplaceWorkingHoursRequestValidator : AbstractValidator<ReplaceWorkingHoursRequest> {
  public ReplaceWorkingHoursRequestValidator() {
    RuleFor(x => x.Items).NotNull().Must(items => items.Count <= 28).WithMessage("Too many working hour entries.");
    RuleForEach(x => x.Items).Must(i => i.StartTime < i.EndTime).WithMessage("Start time must be before end time.");
    RuleFor(x => x.Items).Must(NotOverlap).WithMessage("Working hours must not overlap within a day.");
  }

  private static bool NotOverlap(IReadOnlyList<WorkingHoursDto> items) {
    foreach (var day in items.GroupBy(i => i.DayOfWeek)) {
      var ordered = day.OrderBy(i => i.StartTime).ToList();
      for (var i = 1; i < ordered.Count; i++) {
        if (ordered[i].StartTime < ordered[i - 1].EndTime) {
          return false;
        }
      }
    }
    return true;
  }
}

public class UpsertTimeOffRequestValidator : AbstractValidator<UpsertTimeOffRequest> {
  public UpsertTimeOffRequestValidator() {
    RuleFor(x => x.StaffId).NotEmpty();
    RuleFor(x => x.EndUtc).GreaterThan(x => x.StartUtc).WithMessage("End must be after start.");
    RuleFor(x => x.Reason).MaximumLength(200);
  }
}

public class UpdateBusinessRequestValidator : AbstractValidator<UpdateBusinessRequest> {
  public UpdateBusinessRequestValidator() {
    RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    RuleFor(x => x.Description).MaximumLength(1000);
    RuleFor(x => x.TimeZoneId).NotEmpty().Must(id => TimeZoneInfo.TryFindSystemTimeZoneById(id, out _)).WithMessage("Unknown time zone.");
    RuleFor(x => x.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
    RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress();
    RuleFor(x => x.CancellationWindowHours).InclusiveBetween(0, 720);
    RuleFor(x => x.MinNoticeMinutes).InclusiveBetween(0, 10_080);
    RuleFor(x => x.MaxAdvanceDays).InclusiveBetween(1, 365);
    RuleFor(x => x.SlotStepMinutes).InclusiveBetween(5, 120);
  }
}

public class AvailabilityQueryValidator : AbstractValidator<AvailabilityQuery> {
  public AvailabilityQueryValidator() {
    RuleFor(x => x.ServiceId).NotEmpty();
    RuleFor(x => x.Date).NotEqual(default(DateOnly)).WithMessage("A valid date is required.");
  }
}

public class MonthAvailabilityQueryValidator : AbstractValidator<MonthAvailabilityQuery> {
  public MonthAvailabilityQueryValidator() {
    RuleFor(x => x.ServiceId).NotEmpty();
    RuleFor(x => x.Month).NotEmpty().Matches(@"^\d{4}-(0[1-9]|1[0-2])$").WithMessage("Month must use the format yyyy-MM.");
  }
}

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest> {
  public CreateBookingRequestValidator() {
    RuleFor(x => x.ServiceId).NotEmpty();
    RuleFor(x => x.StartUtc).NotEqual(default(DateTime));
    RuleFor(x => x.Notes).MaximumLength(500);
  }
}

public class CancelBookingRequestValidator : AbstractValidator<CancelBookingRequest> {
  public CancelBookingRequestValidator() => RuleFor(x => x.Reason).MaximumLength(300);
}

public class AdminCancelRequestValidator : AbstractValidator<AdminCancelRequest> {
  public AdminCancelRequestValidator() => RuleFor(x => x.Reason).MaximumLength(300);
}

public class RescheduleRequestValidator : AbstractValidator<RescheduleRequest> {
  public RescheduleRequestValidator() => RuleFor(x => x.StartUtc).NotEqual(default(DateTime));
}

public class CalendarQueryValidator : AbstractValidator<CalendarQuery> {
  public CalendarQueryValidator() {
    RuleFor(x => x.Date).NotEqual(default(DateOnly));
    RuleFor(x => x.View).NotEmpty().Must(v => v is "day" or "week").WithMessage("View must be 'day' or 'week'.");
  }
}

public class ReportQueryValidator : AbstractValidator<ReportQuery> {
  public ReportQueryValidator() {
    RuleFor(x => x).Must(x => x.From == null || x.To == null || x.From <= x.To).WithMessage("From must not be after To.");
    RuleFor(x => x).Must(x => x.From == null || x.To == null || x.To.Value.DayNumber - x.From.Value.DayNumber <= 366).WithMessage("Range must not exceed one year.");
  }
}

public abstract class PageQueryValidator<T> : AbstractValidator<T> where T : PageQuery {
  protected PageQueryValidator() {
    RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
    RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    RuleFor(x => x.Search).MaximumLength(100);
    RuleFor(x => x.Sort).MaximumLength(30);
  }
}

public class PlainPageQueryValidator : PageQueryValidator<PageQuery>;
public class MyBookingsQueryValidator : PageQueryValidator<MyBookingsQuery>;
public class AdminBookingQueryValidator : PageQueryValidator<AdminBookingQuery> {
  public AdminBookingQueryValidator() => RuleFor(x => x).Must(x => x.From == null || x.To == null || x.From <= x.To).WithMessage("From must not be after To.");
}
