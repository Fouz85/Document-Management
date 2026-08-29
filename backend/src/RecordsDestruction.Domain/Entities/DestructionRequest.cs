using RecordsDestruction.Domain.Common;
using RecordsDestruction.Domain.Enums;

namespace RecordsDestruction.Domain.Entities;

public class DestructionRequest : BaseEntity
{
    public string ConcernedParty { get; set; } = string.Empty;
    public string? DestructionNo { get; set; }
    public string Department { get; set; } = string.Empty;
    public string ResponsibleOfficer { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string StorageLocation { get; set; } = string.Empty;
    public decimal? TotalVolume { get; set; }
    public DateTime? RecordsFirstDate { get; set; }
    public DateTime? RecordsLastDate { get; set; }

    // Signature blocks (base64 data URLs)
    public string? CreatorUnitName { get; set; }
    public DateTime? CreatorUnitDate { get; set; }
    public string? CreatorUnitSignature { get; set; }
    public string? CreatorUnitStamp { get; set; }

    public string? LegalAffairsName { get; set; }
    public DateTime? LegalAffairsDate { get; set; }
    public string? LegalAffairsSignature { get; set; }
    public string? LegalAffairsStamp { get; set; }

    public string? InternalAuditName { get; set; }
    public DateTime? InternalAuditDate { get; set; }
    public string? InternalAuditSignature { get; set; }
    public string? InternalAuditStamp { get; set; }

    public string? RecordsManagementName { get; set; }
    public DateTime? RecordsManagementDate { get; set; }
    public string? RecordsManagementSignature { get; set; }
    public string? RecordsManagementStamp { get; set; }

    // Identity is referenced by Id only — Domain has no dependency on Infrastructure.
    public string? SubmittedByUserId { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = RequestStatus.Submitted;
    public string? AdminNotes { get; set; }

    /// <summary>Tracks the physical destruction itself, separate from the approval workflow —
    /// an Approved request may still be sitting physically undestroyed for a while. Once marked,
    /// it's excluded from the "كشف الإتلاف" Excel export. DestroyedByName is a snapshot (the admin's
    /// name at the time), not a live account reference — same reasoning as ResponsibleOfficer.</summary>
    public bool IsDestroyed { get; set; }
    public DateTime? DestroyedAt { get; set; }
    public string? DestroyedByName { get; set; }

    public ICollection<DestructionRecord> Records { get; set; } = new List<DestructionRecord>();
    public ICollection<Approval> Approvals { get; set; } = new List<Approval>();
}
