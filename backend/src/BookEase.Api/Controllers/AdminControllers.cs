using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookEase.Api.Controllers;

[ApiController, Route("api/admin/bookings"), Authorize(Roles = AppRoles.AdminOrStaff)]
public class AdminBookingsController(IBookingAdminService bookings) : ControllerBase {
  [HttpGet]
  public async Task<ActionResult<PagedResult<BookingDto>>> List([FromQuery] AdminBookingQuery query, CancellationToken ct) => Ok(await bookings.ListAsync(query, ct));

  [HttpGet("calendar")]
  public async Task<ActionResult<CalendarDto>> Calendar([FromQuery] CalendarQuery query, CancellationToken ct) => Ok(await bookings.GetCalendarAsync(query, ct));

  [HttpGet("export")]
  public async Task<IActionResult> Export([FromQuery] AdminBookingQuery query, CancellationToken ct) {
    var file = await bookings.ExportCsvAsync(query, ct);
    return File(file.Content, file.ContentType, file.FileName);
  }

  [HttpPost("{id:guid}/confirm")]
  public async Task<ActionResult<BookingDto>> Confirm(Guid id, CancellationToken ct) => Ok(await bookings.ConfirmAsync(id, ct));

  [HttpPost("{id:guid}/complete")]
  public async Task<ActionResult<BookingDto>> Complete(Guid id, CancellationToken ct) => Ok(await bookings.CompleteAsync(id, ct));

  [HttpPost("{id:guid}/no-show")]
  public async Task<ActionResult<BookingDto>> NoShow(Guid id, CancellationToken ct) => Ok(await bookings.NoShowAsync(id, ct));

  [HttpPost("{id:guid}/cancel")]
  public async Task<ActionResult<BookingDto>> Cancel(Guid id, AdminCancelRequest request, CancellationToken ct) => Ok(await bookings.CancelAsync(id, request, ct));
}

[ApiController, Route("api/admin/services"), Authorize(Roles = AppRoles.Admin)]
public class AdminServicesController(IServiceAdminService services) : ControllerBase {
  [HttpGet]
  public async Task<ActionResult<PagedResult<ServiceDto>>> List([FromQuery] PageQuery query, CancellationToken ct) => Ok(await services.ListAsync(query, ct));

  [HttpPost]
  public async Task<ActionResult<ServiceDto>> Create(UpsertServiceRequest request, CancellationToken ct) => StatusCode(StatusCodes.Status201Created, await services.CreateAsync(request, ct));

  [HttpPut("{id:guid}")]
  public async Task<ActionResult<ServiceDto>> Update(Guid id, UpsertServiceRequest request, CancellationToken ct) => Ok(await services.UpdateAsync(id, request, ct));

  [HttpDelete("{id:guid}")]
  public async Task<IActionResult> Delete(Guid id, CancellationToken ct) {
    await services.DeleteAsync(id, ct);
    return NoContent();
  }
}

[ApiController, Route("api/admin/staff"), Authorize(Roles = AppRoles.Admin)]
public class AdminStaffController(IStaffAdminService staff, IScheduleService schedule) : ControllerBase {
  [HttpGet]
  public async Task<ActionResult<PagedResult<StaffDto>>> List([FromQuery] PageQuery query, CancellationToken ct) => Ok(await staff.ListAsync(query, ct));

  [HttpPost]
  public async Task<ActionResult<StaffDto>> Create(UpsertStaffRequest request, CancellationToken ct) => StatusCode(StatusCodes.Status201Created, await staff.CreateAsync(request, ct));

  [HttpPut("{id:guid}")]
  public async Task<ActionResult<StaffDto>> Update(Guid id, UpsertStaffRequest request, CancellationToken ct) => Ok(await staff.UpdateAsync(id, request, ct));

  [HttpDelete("{id:guid}")]
  public async Task<IActionResult> Delete(Guid id, CancellationToken ct) {
    await staff.DeleteAsync(id, ct);
    return NoContent();
  }

  [HttpGet("{id:guid}/working-hours")]
  public async Task<ActionResult<IReadOnlyList<WorkingHoursDto>>> GetHours(Guid id, CancellationToken ct) => Ok(await schedule.GetWorkingHoursAsync(id, ct));

  [HttpPut("{id:guid}/working-hours")]
  public async Task<ActionResult<IReadOnlyList<WorkingHoursDto>>> ReplaceHours(Guid id, ReplaceWorkingHoursRequest request, CancellationToken ct) => Ok(await schedule.ReplaceWorkingHoursAsync(id, request, ct));
}

[ApiController, Route("api/admin/time-off"), Authorize(Roles = AppRoles.Admin)]
public class AdminTimeOffController(IScheduleService schedule) : ControllerBase {
  [HttpGet]
  public async Task<ActionResult<PagedResult<TimeOffDto>>> List([FromQuery] Guid? staffId, [FromQuery] PageQuery query, CancellationToken ct) => Ok(await schedule.ListTimeOffAsync(staffId, query, ct));

  [HttpPost]
  public async Task<ActionResult<TimeOffDto>> Create(UpsertTimeOffRequest request, CancellationToken ct) => StatusCode(StatusCodes.Status201Created, await schedule.CreateTimeOffAsync(request, ct));

  [HttpPut("{id:guid}")]
  public async Task<ActionResult<TimeOffDto>> Update(Guid id, UpsertTimeOffRequest request, CancellationToken ct) => Ok(await schedule.UpdateTimeOffAsync(id, request, ct));

  [HttpDelete("{id:guid}")]
  public async Task<IActionResult> Delete(Guid id, CancellationToken ct) {
    await schedule.DeleteTimeOffAsync(id, ct);
    return NoContent();
  }
}

[ApiController, Route("api/admin"), Authorize(Roles = AppRoles.Admin)]
public class AdminReportsController(IReportService reports, IBusinessAdminService business, IAuditService audit) : ControllerBase {
  [HttpGet("overview")]
  public async Task<ActionResult<OverviewDto>> Overview(CancellationToken ct) => Ok(await reports.GetOverviewAsync(ct));

  [HttpGet("reports")]
  public async Task<ActionResult<ReportsDto>> Reports([FromQuery] ReportQuery query, CancellationToken ct) => Ok(await reports.GetReportsAsync(query, ct));

  [HttpGet("audit-logs")]
  public async Task<ActionResult<PagedResult<AuditLogDto>>> AuditLogs([FromQuery] PageQuery query, CancellationToken ct) => Ok(await audit.ListAsync(query, ct));

  [HttpPut("business")]
  public async Task<ActionResult<BusinessDto>> UpdateBusiness(UpdateBusinessRequest request, CancellationToken ct) => Ok(await business.UpdateAsync(request, ct));
}
