using BookEase.Domain.Common;
using BookEase.Domain.Enums;

namespace BookEase.Domain.Entities;

public class User : BaseEntity {
  public string Email { get; set; } = string.Empty;
  public string PasswordHash { get; set; } = string.Empty;
  public string FullName { get; set; } = string.Empty;
  public string? Phone { get; set; }
  public UserRole Role { get; set; } = UserRole.Customer;
  public bool IsActive { get; set; } = true;
  public List<RefreshToken> RefreshTokens { get; set; } = [];
}
