using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class ServiceAdminService(IAppDbContext db, IAuditService audit) : IServiceAdminService {
  public async Task<PagedResult<ServiceDto>> ListAsync(PageQuery query, CancellationToken ct) {
    var services = db.Services.AsNoTracking().Include(s => s.StaffServices).AsQueryable();
    if (string.IsNullOrWhiteSpace(query.Search) == false) {
      var term = query.Search.Trim().ToLower();
      services = services.Where(s => s.Name.ToLower().Contains(term));
    }
    services = query.Sort?.ToLowerInvariant() switch {
      "price" => services.OrderByDirection(s => s.PriceCents, query.Desc),
      "duration" => services.OrderByDirection(s => s.DurationMinutes, query.Desc),
      _ => services.OrderByDirection(s => s.Name, query.Desc),
    };
    var page = await services.ToPagedAsync(query.Page, query.PageSize, ct);
    return page.Map(s => s.ToDto(s.StaffServices.Select(x => x.StaffId)));
  }

  public async Task<ServiceDto> CreateAsync(UpsertServiceRequest request, CancellationToken ct) {
    var service = new Service();
    Apply(service, request);
    db.Services.Add(service);
    audit.Record("service.created", nameof(Service), service.Id.ToString(), service.Name);
    await db.SaveChangesAsync(ct);
    return service.ToDto([]);
  }

  public async Task<ServiceDto> UpdateAsync(Guid id, UpsertServiceRequest request, CancellationToken ct) {
    var service = await db.Services.Include(s => s.StaffServices).FirstOrDefaultAsync(s => s.Id == id, ct)
      ?? throw new NotFoundException("Service not found.");
    Apply(service, request);
    audit.Record("service.updated", nameof(Service), id.ToString(), service.Name);
    await db.SaveChangesAsync(ct);
    return service.ToDto(service.StaffServices.Select(x => x.StaffId));
  }

  public async Task DeleteAsync(Guid id, CancellationToken ct) {
    var service = await db.Services.FirstOrDefaultAsync(s => s.Id == id, ct) ?? throw new NotFoundException("Service not found.");
    if (await db.Bookings.AnyAsync(b => b.ServiceId == id, ct)) {
      service.IsActive = false;
      audit.Record("service.archived", nameof(Service), id.ToString(), service.Name);
    } else {
      db.Services.Remove(service);
      audit.Record("service.deleted", nameof(Service), id.ToString(), service.Name);
    }
    await db.SaveChangesAsync(ct);
  }

  private static void Apply(Service service, UpsertServiceRequest request) {
    service.Name = request.Name.Trim();
    service.Description = request.Description.Trim();
    service.DurationMinutes = request.DurationMinutes;
    service.BufferMinutes = request.BufferMinutes;
    service.PriceCents = request.PriceCents;
    service.IsActive = request.IsActive;
  }
}

public class StaffAdminService(IAppDbContext db, IAuditService audit) : IStaffAdminService {
  public async Task<PagedResult<StaffDto>> ListAsync(PageQuery query, CancellationToken ct) {
    var staff = db.StaffMembers.AsNoTracking().Include(s => s.StaffServices).AsQueryable();
    if (string.IsNullOrWhiteSpace(query.Search) == false) {
      var term = query.Search.Trim().ToLower();
      staff = staff.Where(s => s.Name.ToLower().Contains(term) || s.Title.ToLower().Contains(term));
    }
    staff = query.Sort?.ToLowerInvariant() switch {
      "title" => staff.OrderByDirection(s => s.Title, query.Desc),
      _ => staff.OrderByDirection(s => s.Name, query.Desc),
    };
    var page = await staff.ToPagedAsync(query.Page, query.PageSize, ct);
    return page.Map(s => s.ToDto());
  }

  public async Task<StaffDto> CreateAsync(UpsertStaffRequest request, CancellationToken ct) {
    var staff = new Staff();
    await ApplyAsync(staff, request, ct);
    db.StaffMembers.Add(staff);
    audit.Record("staff.created", nameof(Staff), staff.Id.ToString(), staff.Name);
    await db.SaveChangesAsync(ct);
    return staff.ToDto();
  }

  public async Task<StaffDto> UpdateAsync(Guid id, UpsertStaffRequest request, CancellationToken ct) {
    var staff = await db.StaffMembers.Include(s => s.StaffServices).FirstOrDefaultAsync(s => s.Id == id, ct)
      ?? throw new NotFoundException("Staff member not found.");
    await ApplyAsync(staff, request, ct);
    audit.Record("staff.updated", nameof(Staff), id.ToString(), staff.Name);
    await db.SaveChangesAsync(ct);
    return staff.ToDto();
  }

  public async Task DeleteAsync(Guid id, CancellationToken ct) {
    var staff = await db.StaffMembers.FirstOrDefaultAsync(s => s.Id == id, ct) ?? throw new NotFoundException("Staff member not found.");
    if (await db.Bookings.AnyAsync(b => b.StaffId == id, ct)) {
      staff.IsActive = false;
      audit.Record("staff.archived", nameof(Staff), id.ToString(), staff.Name);
    } else {
      db.StaffMembers.Remove(staff);
      audit.Record("staff.deleted", nameof(Staff), id.ToString(), staff.Name);
    }
    await db.SaveChangesAsync(ct);
  }

  private async Task ApplyAsync(Staff staff, UpsertStaffRequest request, CancellationToken ct) {
    var wanted = request.ServiceIds.Distinct().ToList();
    var existingIds = await db.Services.Where(s => wanted.Contains(s.Id)).Select(s => s.Id).ToListAsync(ct);
    if (existingIds.Count != wanted.Count) {
      throw new BadRequestException("One or more selected services do not exist.");
    }
    staff.Name = request.Name.Trim();
    staff.Title = request.Title.Trim();
    staff.Bio = request.Bio?.Trim();
    staff.IsActive = request.IsActive;
    var toRemove = staff.StaffServices.Where(x => wanted.Contains(x.ServiceId) == false).ToList();
    db.StaffServices.RemoveRange(toRemove);
    foreach (var serviceId in wanted.Where(w => staff.StaffServices.Any(x => x.ServiceId == w) == false)) {
      staff.StaffServices.Add(new StaffService { StaffId = staff.Id, ServiceId = serviceId });
    }
    foreach (var removed in toRemove) {
      staff.StaffServices.Remove(removed);
    }
  }
}

public class BusinessAdminService(IAppDbContext db, IAuditService audit) : IBusinessAdminService {
  public async Task<BusinessDto> UpdateAsync(UpdateBusinessRequest request, CancellationToken ct) {
    var business = await db.Businesses.FirstAsync(ct);
    business.Name = request.Name.Trim();
    business.Description = request.Description?.Trim();
    business.TimeZoneId = request.TimeZoneId;
    business.Currency = request.Currency.ToLowerInvariant();
    business.ContactEmail = request.ContactEmail.Trim();
    business.CancellationWindowHours = request.CancellationWindowHours;
    business.MinNoticeMinutes = request.MinNoticeMinutes;
    business.MaxAdvanceDays = request.MaxAdvanceDays;
    business.SlotStepMinutes = request.SlotStepMinutes;
    audit.Record("business.updated", nameof(Business), business.Id.ToString());
    await db.SaveChangesAsync(ct);
    return business.ToDto();
  }
}
