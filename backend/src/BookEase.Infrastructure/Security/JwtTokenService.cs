using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BookEase.Application.Abstractions;
using BookEase.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BookEase.Infrastructure.Security;

public class JwtOptions {
  public const string Section = "Jwt";
  public string Key { get; set; } = string.Empty;
  public string Issuer { get; set; } = "BookEase";
  public string Audience { get; set; } = "BookEase.Client";
  public int AccessTokenMinutes { get; set; } = 15;
  public int RefreshTokenDays { get; set; } = 14;
}

public class JwtTokenService(IOptions<JwtOptions> options, IClock clock) : ITokenService {
  private readonly JwtOptions _options = options.Value;

  public TimeSpan RefreshTokenLifetime => TimeSpan.FromDays(_options.RefreshTokenDays);

  public AccessTokenResult CreateAccessToken(User user) {
    var now = clock.UtcNow;
    var expires = now.AddMinutes(_options.AccessTokenMinutes);
    var claims = new List<Claim> {
      new("sub", user.Id.ToString()),
      new("email", user.Email),
      new("name", user.FullName),
      new("role", user.Role.ToString()),
      new("jti", Guid.NewGuid().ToString("N")),
    };
    var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)), SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(_options.Issuer, _options.Audience, claims, now, expires, credentials);
    return new AccessTokenResult(new JwtSecurityTokenHandler().WriteToken(token), expires);
  }

  public string GenerateRefreshToken() =>
    Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

  public string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
