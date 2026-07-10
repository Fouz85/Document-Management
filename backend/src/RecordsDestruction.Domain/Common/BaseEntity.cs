namespace RecordsDestruction.Domain.Common;

/// <summary>
/// Base entity for all domain entities.
/// Soft delete is mandatory (no physical deletes) per office standards & PDPPL.
/// </summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastModifiedAt { get; set; }
}
