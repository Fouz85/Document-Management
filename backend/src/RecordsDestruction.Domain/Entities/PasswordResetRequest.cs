using RecordsDestruction.Domain.Common;

namespace RecordsDestruction.Domain.Entities;

public class PasswordResetRequest : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedByUserId { get; set; }
}
