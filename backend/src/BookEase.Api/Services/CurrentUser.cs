using System.Security.Claims;
using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Domain.Enums;

namespace BookEase.Api.Services;

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser {
  private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

  public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;
  public Guid? UserIdOrNull => Guid.TryParse(Principal?.FindFirstValue("sub"), out var id) ? id : null;
  public Guid UserId => UserIdOrNull ?? throw new UnauthorizedException("Authentication required.");
  public UserRole Role => Enum.TryParse<UserRole>(Principal?.FindFirstValue("role"), out var role) ? role : UserRole.Customer;
  public string? Email => Principal?.FindFirstValue("email");
}
