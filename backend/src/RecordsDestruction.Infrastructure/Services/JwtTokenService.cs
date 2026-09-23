using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using RecordsDestruction.Infrastructure.Identity;
using RecordsDestruction.Infrastructure.Persistence;

namespace RecordsDestruction.Infrastructure.Services;

public class JwtTokenService
{
    // Kept short deliberately: this is the bearer token JS code can read (sessionStorage), so its
    // exposure window on XSS/theft is minutes, not hours. Sessions are kept alive via RefreshAsync.
    private static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromMinutes(20);
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromHours(12);

    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _db;
    public JwtTokenService(IConfiguration config, ApplicationDbContext db)
    {
        _config = config;
        _db = db;
    }

    public (string Token, DateTime ExpiresAtUtc) CreateToken(ApplicationUser user, IList<string> roles)
    {
        // Jwt:Key must come from environment / user-secrets — never committed.
        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var expires = DateTime.UtcNow.Add(AccessTokenLifetime);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("fullName", user.FullName)
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"],
            Expires = expires,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256)
        };
        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }

    private static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

    /// <summary>Issues a new refresh token for the user and persists only its hash.</summary>
    public async Task<string> CreateRefreshTokenAsync(string userId)
    {
        var raw = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = Hash(raw),
            ExpiresAtUtc = DateTime.UtcNow.Add(RefreshTokenLifetime)
        });
        await _db.SaveChangesAsync();
        return raw;
    }

    /// <summary>Validates a refresh token, revokes it (single use / rotation), and issues a new
    /// access + refresh token pair. Returns null if the token is missing, expired, or already used.</summary>
    public async Task<(ApplicationUser User, string Token, DateTime ExpiresAtUtc, string RefreshToken)?> RefreshAsync(string rawToken)
    {
        var hash = Hash(rawToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (stored is null || stored.RevokedAtUtc is not null || stored.ExpiresAtUtc <= DateTime.UtcNow)
            return null;

        var user = await _db.Users.FindAsync(stored.UserId);
        if (user is null || !user.IsActive) return null;

        stored.RevokedAtUtc = DateTime.UtcNow;

        var roles = await _db.UserRoles.Where(r => r.UserId == user.Id)
            .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name!)
            .ToListAsync();
        var (token, expires) = CreateToken(user, roles);
        var newRefresh = await CreateRefreshTokenAsync(user.Id);
        return (user, token, expires, newRefresh);
    }

    /// <summary>Revokes every currently-active refresh token for the user — called on logout so a
    /// captured refresh token can't be used after the user has explicitly signed out.</summary>
    public async Task RevokeAllAsync(string userId)
    {
        var active = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ToListAsync();
        foreach (var t in active) t.RevokedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
