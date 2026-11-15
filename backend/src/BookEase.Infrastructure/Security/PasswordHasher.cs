using System.Security.Cryptography;
using BookEase.Application.Abstractions;

namespace BookEase.Infrastructure.Security;

public class Pbkdf2PasswordHasher : IPasswordHasher {
  private const int SaltSize = 16;
  private const int HashSize = 32;
  private const int Iterations = 210_000;

  public string Hash(string password) {
    var salt = RandomNumberGenerator.GetBytes(SaltSize);
    var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA512, HashSize);
    return $"v1.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
  }

  public bool Verify(string hash, string password) {
    var parts = hash.Split('.');
    if (parts.Length != 4 || parts[0] != "v1" || int.TryParse(parts[1], out var iterations) == false) {
      return false;
    }
    try {
      var salt = Convert.FromBase64String(parts[2]);
      var expected = Convert.FromBase64String(parts[3]);
      var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, expected.Length);
      return CryptographicOperations.FixedTimeEquals(actual, expected);
    } catch (FormatException) {
      return false;
    }
  }
}
