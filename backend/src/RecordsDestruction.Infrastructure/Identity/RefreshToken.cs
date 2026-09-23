namespace RecordsDestruction.Infrastructure.Identity;

/// <summary>Server-side record backing token refresh/revocation. The raw token is never persisted —
/// only its SHA-256 hash — so a database read alone can't be used to impersonate a session.
/// One-time use: RefreshAsync (JwtTokenService) revokes the row it consumes and issues a new one
/// (rotation), so a stolen-and-reused refresh token is detectable (it'll already be revoked).</summary>
public class RefreshToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAtUtc { get; set; }
}
