using BookEase.Application.Abstractions;
using BookEase.Application.Dtos;
using BookEase.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class CatalogService(IAppDbContext db, IPaymentGateway gateway) : ICatalogService {
  public async Task<BusinessDto> GetBusinessAsync(CancellationToken ct) =>
    (await db.Businesses.AsNoTracking().FirstAsync(ct)).ToDto();

  public PublicConfigDto GetPublicConfig() => new(gateway.PublishableKey, gateway.IsDemo);

  public async Task<IReadOnlyList<ServiceDto>> ListServicesAsync(CancellationToken ct) {
    var activeStaff = await db.StaffMembers.AsNoTracking().Where(s => s.IsActive).Select(s => s.Id).ToListAsync(ct);
    var services = await db.Services.AsNoTracking().Include(s => s.StaffServices).Where(s => s.IsActive).OrderBy(s => s.Name).ToListAsync(ct);
    return services
      .Select(s => s.ToDto(s.StaffServices.Select(x => x.StaffId).Where(activeStaff.Contains)))
      .Where(s => s.StaffIds.Count > 0)
      .ToList();
  }

  public async Task<ServiceDto> GetServiceAsync(Guid id, CancellationToken ct) {
    var services = await ListServicesAsync(ct);
    return services.FirstOrDefault(s => s.Id == id) ?? throw new NotFoundException("Service not found.");
  }

  public async Task<IReadOnlyList<StaffDto>> ListStaffAsync(Guid? serviceId, CancellationToken ct) {
    var query = db.StaffMembers.AsNoTracking().Include(s => s.StaffServices).Where(s => s.IsActive);
    if (serviceId != null) {
      query = query.Where(s => s.StaffServices.Any(x => x.ServiceId == serviceId));
    }
    var staff = await query.OrderBy(s => s.Name).ToListAsync(ct);
    return staff.Select(s => s.ToDto()).ToList();
  }
}
