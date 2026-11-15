namespace BookEase.Application.Dtos;

public record BusinessDto(string Name, string? Description, string TimeZoneId, string Currency, string ContactEmail, int CancellationWindowHours, int MinNoticeMinutes, int MaxAdvanceDays, int SlotStepMinutes);
public record UpdateBusinessRequest(string Name, string? Description, string TimeZoneId, string Currency, string ContactEmail, int CancellationWindowHours, int MinNoticeMinutes, int MaxAdvanceDays, int SlotStepMinutes);
public record PublicConfigDto(string? StripePublishableKey, bool DemoPayments);

public record ServiceDto(Guid Id, string Name, string Description, int DurationMinutes, int BufferMinutes, int PriceCents, bool IsActive, IReadOnlyList<Guid> StaffIds);
public record UpsertServiceRequest(string Name, string Description, int DurationMinutes, int BufferMinutes, int PriceCents, bool IsActive);

public record StaffDto(Guid Id, string Name, string Title, string? Bio, bool IsActive, IReadOnlyList<Guid> ServiceIds);
public record UpsertStaffRequest(string Name, string Title, string? Bio, bool IsActive, IReadOnlyList<Guid> ServiceIds);

public record WorkingHoursDto(DayOfWeek DayOfWeek, TimeOnly StartTime, TimeOnly EndTime);
public record ReplaceWorkingHoursRequest(IReadOnlyList<WorkingHoursDto> Items);

public record TimeOffDto(Guid Id, Guid StaffId, string StaffName, DateTime StartUtc, DateTime EndUtc, string? Reason);
public record UpsertTimeOffRequest(Guid StaffId, DateTime StartUtc, DateTime EndUtc, string? Reason);

public record AvailabilityQuery(Guid ServiceId, DateOnly Date, Guid? StaffId);
public record MonthAvailabilityQuery(Guid ServiceId, string Month, Guid? StaffId);
public record SlotDto(DateTime StartUtc, DateTime EndUtc, IReadOnlyList<Guid> StaffIds);
public record AvailabilityDto(DateOnly Date, string TimeZoneId, IReadOnlyList<SlotDto> Slots);
public record DayAvailabilityDto(DateOnly Date, bool HasSlots);
public record MonthAvailabilityDto(string Month, string TimeZoneId, IReadOnlyList<DayAvailabilityDto> Days);
