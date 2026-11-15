using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Services;

public class AuthService(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens, IClock clock, ICurrentUser currentUser) : IAuthService {
  public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct) {
    var email = request.Email.Trim().ToLowerInvariant();
    if (await db.Users.AnyAsync(u => u.Email == email, ct)) {
      throw new ConflictException("An account with this email already exists.");
    }
    var user = new User {
      Email = email,
      PasswordHash = hasher.Hash(request.Password),
      FullName = request.FullName.Trim(),
      Phone = request.Phone?.Trim(),
      Role = UserRole.Customer,
    };
    db.Users.Add(user);
    var raw = tokens.GenerateRefreshToken();
    var response = BuildSession(user, raw);
    try {
      await db.SaveChangesAsync(ct);
    } catch (DbUpdateException) {
      throw new ConflictException("An account with this email already exists.");
    }
    return response;
  }

  public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct) {
    var email = request.Email.Trim().ToLowerInvariant();
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
    if (user == null) {
      hasher.Hash(request.Password);
      throw new UnauthorizedException("Invalid email or password.");
    }
    if (hasher.Verify(user.PasswordHash, request.Password) == false || user.IsActive == false) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    await RemoveExpiredAsync(user.Id, ct);
    var response = BuildSession(user, tokens.GenerateRefreshToken());
    await db.SaveChangesAsync(ct);
    return response;
  }

  public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct) {
    var now = clock.UtcNow;
    var hash = tokens.Hash(request.RefreshToken);
    var stored = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
    if (stored == null) {
      throw new UnauthorizedException("Invalid refresh token.");
    }
    if (stored.RevokedAtUtc != null) {
      await db.RefreshTokens
        .Where(t => t.UserId == stored.UserId && t.RevokedAtUtc == null)
        .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);
      throw new UnauthorizedException("Refresh token has been revoked.");
    }
    if (stored.IsActive(now) == false || stored.User.IsActive == false) {
      throw new UnauthorizedException("Refresh token has expired.");
    }
    var raw = tokens.GenerateRefreshToken();
    stored.RevokedAtUtc = now;
    stored.ReplacedByHash = tokens.Hash(raw);
    var response = BuildSession(stored.User, raw);
    await db.SaveChangesAsync(ct);
    return response;
  }

  public async Task LogoutAsync(RefreshRequest request, CancellationToken ct) {
    var hash = tokens.Hash(request.RefreshToken);
    var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
    if (stored == null || stored.RevokedAtUtc != null) {
      return;
    }
    stored.RevokedAtUtc = clock.UtcNow;
    await db.SaveChangesAsync(ct);
  }

  public async Task<UserDto> MeAsync(CancellationToken ct) {
    var id = currentUser.UserId;
    var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new UnauthorizedException("Account no longer exists.");
    return user.ToDto();
  }

  private AuthResponse BuildSession(User user, string rawRefreshToken) {
    var access = tokens.CreateAccessToken(user);
    db.RefreshTokens.Add(new RefreshToken {
      UserId = user.Id,
      TokenHash = tokens.Hash(rawRefreshToken),
      ExpiresAtUtc = clock.UtcNow.Add(tokens.RefreshTokenLifetime),
    });
    return new AuthResponse(access.Token, rawRefreshToken, access.ExpiresAtUtc, user.ToDto());
  }

  private async Task RemoveExpiredAsync(Guid userId, CancellationToken ct) {
    var now = clock.UtcNow;
    await db.RefreshTokens.Where(t => t.UserId == userId && t.ExpiresAtUtc < now).ExecuteDeleteAsync(ct);
  }
}
