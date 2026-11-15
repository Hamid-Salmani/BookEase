using BookEase.Application.Availability;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;

namespace BookEase.Application.Abstractions;

public interface IAuthService {
  Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct);
  Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct);
  Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct);
  Task LogoutAsync(RefreshRequest request, CancellationToken ct);
  Task<UserDto> MeAsync(CancellationToken ct);
}

public interface ICatalogService {
  Task<BusinessDto> GetBusinessAsync(CancellationToken ct);
  PublicConfigDto GetPublicConfig();
  Task<IReadOnlyList<ServiceDto>> ListServicesAsync(CancellationToken ct);
  Task<ServiceDto> GetServiceAsync(Guid id, CancellationToken ct);
  Task<IReadOnlyList<StaffDto>> ListStaffAsync(Guid? serviceId, CancellationToken ct);
}

public interface IServiceAdminService {
  Task<PagedResult<ServiceDto>> ListAsync(PageQuery query, CancellationToken ct);
  Task<ServiceDto> CreateAsync(UpsertServiceRequest request, CancellationToken ct);
  Task<ServiceDto> UpdateAsync(Guid id, UpsertServiceRequest request, CancellationToken ct);
  Task DeleteAsync(Guid id, CancellationToken ct);
}

public interface IStaffAdminService {
  Task<PagedResult<StaffDto>> ListAsync(PageQuery query, CancellationToken ct);
  Task<StaffDto> CreateAsync(UpsertStaffRequest request, CancellationToken ct);
  Task<StaffDto> UpdateAsync(Guid id, UpsertStaffRequest request, CancellationToken ct);
  Task DeleteAsync(Guid id, CancellationToken ct);
}

public interface IBusinessAdminService {
  Task<BusinessDto> UpdateAsync(UpdateBusinessRequest request, CancellationToken ct);
}

public interface IScheduleService {
  Task<IReadOnlyList<WorkingHoursDto>> GetWorkingHoursAsync(Guid staffId, CancellationToken ct);
  Task<IReadOnlyList<WorkingHoursDto>> ReplaceWorkingHoursAsync(Guid staffId, ReplaceWorkingHoursRequest request, CancellationToken ct);
  Task<PagedResult<TimeOffDto>> ListTimeOffAsync(Guid? staffId, PageQuery query, CancellationToken ct);
  Task<TimeOffDto> CreateTimeOffAsync(UpsertTimeOffRequest request, CancellationToken ct);
  Task<TimeOffDto> UpdateTimeOffAsync(Guid id, UpsertTimeOffRequest request, CancellationToken ct);
  Task DeleteTimeOffAsync(Guid id, CancellationToken ct);
}

public interface IAvailabilityService {
  Task<AvailabilityDto> GetSlotsAsync(AvailabilityQuery query, CancellationToken ct);
  Task<MonthAvailabilityDto> GetMonthAsync(MonthAvailabilityQuery query, CancellationToken ct);
  Task<AvailabilitySnapshot> LoadSnapshotAsync(Guid serviceId, Guid? staffId, DateOnly from, DateOnly to, Guid? excludeBookingId, CancellationToken ct);
}

public interface IBookingService {
  Task<CreateBookingResponse> CreateAsync(CreateBookingRequest request, CancellationToken ct);
  Task<PagedResult<BookingDto>> ListMineAsync(MyBookingsQuery query, CancellationToken ct);
  Task<BookingDto> GetAsync(Guid id, CancellationToken ct);
  Task<CancellationQuoteDto> GetCancellationQuoteAsync(Guid id, CancellationToken ct);
  Task<BookingDto> CancelAsync(Guid id, CancelBookingRequest request, CancellationToken ct);
  Task<BookingDto> RescheduleAsync(Guid id, RescheduleRequest request, CancellationToken ct);
}

public interface IBookingAdminService {
  Task<PagedResult<BookingDto>> ListAsync(AdminBookingQuery query, CancellationToken ct);
  Task<CalendarDto> GetCalendarAsync(CalendarQuery query, CancellationToken ct);
  Task<ExportFile> ExportCsvAsync(AdminBookingQuery query, CancellationToken ct);
  Task<BookingDto> ConfirmAsync(Guid id, CancellationToken ct);
  Task<BookingDto> CompleteAsync(Guid id, CancellationToken ct);
  Task<BookingDto> NoShowAsync(Guid id, CancellationToken ct);
  Task<BookingDto> CancelAsync(Guid id, AdminCancelRequest request, CancellationToken ct);
}

public interface IPaymentService {
  Task HandleWebhookAsync(string payload, string signatureHeader, CancellationToken ct);
  Task HandleEventAsync(GatewayEvent gatewayEvent, CancellationToken ct);
  Task SimulateSuccessAsync(string paymentIntentId, CancellationToken ct);
  Task<bool> RefundBookingAsync(Booking booking, CancellationToken ct);
}

public interface IReportService {
  Task<OverviewDto> GetOverviewAsync(CancellationToken ct);
  Task<ReportsDto> GetReportsAsync(ReportQuery query, CancellationToken ct);
}

public interface IAuditService {
  void Record(string action, string entityName, string? entityId, string? details = null);
  Task<PagedResult<AuditLogDto>> ListAsync(PageQuery query, CancellationToken ct);
}

public enum BookingEmailEvent { Confirmed, Cancelled, Rescheduled, Reminder }

public interface IEmailService {
  Task QueueBookingEmailAsync(BookingEmailEvent kind, Guid bookingId, CancellationToken ct);
}

public interface IEmailDispatcher {
  Task<int> DispatchPendingAsync(CancellationToken ct);
}

public interface IMaintenanceService {
  Task<int> ExpirePendingAsync(CancellationToken ct);
  Task<int> QueueRemindersAsync(CancellationToken ct);
}
