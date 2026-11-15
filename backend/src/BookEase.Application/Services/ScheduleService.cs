using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class ScheduleService(IAppDbContext db, IAuditService audit) : IScheduleService {
  public async Task<IReadOnlyList<WorkingHoursDto>> GetWorkingHoursAsync(Guid staffId, CancellationToken ct) {
    await EnsureStaffAsync(staffId, ct);
    var hours = await db.WorkingHours.AsNoTracking().Where(w => w.StaffId == staffId).ToListAsync(ct);
    return hours.OrderBy(w => w.DayOfWeek).ThenBy(w => w.StartTime).Select(w => w.ToDto()).ToList();
  }

  public async Task<IReadOnlyList<WorkingHoursDto>> ReplaceWorkingHoursAsync(Guid staffId, ReplaceWorkingHoursRequest request, CancellationToken ct) {
    await EnsureStaffAsync(staffId, ct);
    var existing = await db.WorkingHours.Where(w => w.StaffId == staffId).ToListAsync(ct);
    db.WorkingHours.RemoveRange(existing);
    foreach (var item in request.Items) {
      db.WorkingHours.Add(new WorkingHours { StaffId = staffId, DayOfWeek = item.DayOfWeek, StartTime = item.StartTime, EndTime = item.EndTime });
    }
    audit.Record("working-hours.replaced", nameof(Staff), staffId.ToString(), $"{request.Items.Count} entries");
    await db.SaveChangesAsync(ct);
    return await GetWorkingHoursAsync(staffId, ct);
  }

  public async Task<PagedResult<TimeOffDto>> ListTimeOffAsync(Guid? staffId, PageQuery query, CancellationToken ct) {
    var items = db.TimeOffs.AsNoTracking().AsQueryable();
    if (staffId != null) {
      items = items.Where(t => t.StaffId == staffId);
    }
    if (string.IsNullOrWhiteSpace(query.Search) == false) {
      var term = query.Search.Trim().ToLower();
      items = items.Where(t => t.Staff.Name.ToLower().Contains(term) || (t.Reason != null && t.Reason.ToLower().Contains(term)));
    }
    items = items.OrderByDirection(t => t.StartUtc, query.Sort == null || query.Desc);
    return await items.Select(Mappings.TimeOffProjection).ToPagedAsync(query.Page, query.PageSize, ct);
  }

  public async Task<TimeOffDto> CreateTimeOffAsync(UpsertTimeOffRequest request, CancellationToken ct) {
    await EnsureStaffAsync(request.StaffId, ct);
    var timeOff = new TimeOff { StaffId = request.StaffId };
    Apply(timeOff, request);
    db.TimeOffs.Add(timeOff);
    audit.Record("time-off.created", nameof(TimeOff), timeOff.Id.ToString());
    await db.SaveChangesAsync(ct);
    return await GetTimeOffAsync(timeOff.Id, ct);
  }

  public async Task<TimeOffDto> UpdateTimeOffAsync(Guid id, UpsertTimeOffRequest request, CancellationToken ct) {
    await EnsureStaffAsync(request.StaffId, ct);
    var timeOff = await db.TimeOffs.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Time off not found.");
    timeOff.StaffId = request.StaffId;
    Apply(timeOff, request);
    audit.Record("time-off.updated", nameof(TimeOff), id.ToString());
    await db.SaveChangesAsync(ct);
    return await GetTimeOffAsync(id, ct);
  }

  public async Task DeleteTimeOffAsync(Guid id, CancellationToken ct) {
    var timeOff = await db.TimeOffs.FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("Time off not found.");
    db.TimeOffs.Remove(timeOff);
    audit.Record("time-off.deleted", nameof(TimeOff), id.ToString());
    await db.SaveChangesAsync(ct);
  }

  private static void Apply(TimeOff timeOff, UpsertTimeOffRequest request) {
    timeOff.StartUtc = TimeHelper.AsUtc(request.StartUtc);
    timeOff.EndUtc = TimeHelper.AsUtc(request.EndUtc);
    timeOff.Reason = request.Reason?.Trim();
  }

  private async Task<TimeOffDto> GetTimeOffAsync(Guid id, CancellationToken ct) =>
    await db.TimeOffs.AsNoTracking().Where(t => t.Id == id).Select(Mappings.TimeOffProjection).FirstAsync(ct);

  private async Task EnsureStaffAsync(Guid staffId, CancellationToken ct) {
    if (await db.StaffMembers.AnyAsync(s => s.Id == staffId, ct) == false) {
      throw new NotFoundException("Staff member not found.");
    }
  }
}
