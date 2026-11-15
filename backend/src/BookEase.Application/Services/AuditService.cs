using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class AuditService(IAppDbContext db, ICurrentUser user, IClock clock) : IAuditService {
  public void Record(string action, string entityName, string? entityId, string? details = null) =>
    db.AuditLogs.Add(new AuditLog {
      UserId = user.UserIdOrNull,
      UserEmail = user.Email,
      Action = action,
      EntityName = entityName,
      EntityId = entityId,
      Details = details,
      CreatedAt = clock.UtcNow,
    });

  public async Task<PagedResult<AuditLogDto>> ListAsync(PageQuery query, CancellationToken ct) {
    IQueryable<AuditLog> logs = db.AuditLogs.AsNoTracking();
    if (string.IsNullOrWhiteSpace(query.Search) == false) {
      var term = query.Search.Trim().ToLower();
      logs = logs.Where(l => l.Action.ToLower().Contains(term) || l.EntityName.ToLower().Contains(term) || (l.UserEmail != null && l.UserEmail.ToLower().Contains(term)));
    }
    logs = logs.OrderByDescending(l => l.CreatedAt);
    var page = await logs.ToPagedAsync(query.Page, query.PageSize, ct);
    return page.Map(l => new AuditLogDto(l.Id, l.CreatedAt, l.UserEmail, l.Action, l.EntityName, l.EntityId, l.Details));
  }
}
