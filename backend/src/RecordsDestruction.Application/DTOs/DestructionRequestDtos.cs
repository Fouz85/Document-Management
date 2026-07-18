using System.ComponentModel.DataAnnotations;

namespace RecordsDestruction.Application.DTOs;

public class DestructionRecordDto
{
    public int SerialNo { get; set; }
    public string? RecordsTitle { get; set; }
    public string? OriginalOrCopy { get; set; }
    public string? RecordsType { get; set; }
    public string? StorageMedium { get; set; }
    public string? RetentionRuleNo { get; set; }
    public DateTime? FirstDate { get; set; }
    public DateTime? LastDate { get; set; }
    public decimal? RecordsVolume { get; set; }
    public string? Remarks { get; set; }
}

public class SignatureBlockDto
{
    public string? Name { get; set; }
    public DateTime? Date { get; set; }
    public string? Signature { get; set; }
    public string? Stamp { get; set; }
}

/// <summary>Create / update payload. Validation messages are keys resolved client-side (no hardcoded UI strings).</summary>
public class SaveDestructionRequestDto
{
    [Required] public string ConcernedParty { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{4}\\\d+$")]
    public string DestructionNo { get; set; } = string.Empty;

    [Required] public string Department { get; set; } = string.Empty;
    [Required] public string ResponsibleOfficer { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^(\+974|974)?[34567]\d{7}$")]
    public string Phone { get; set; } = string.Empty;

    [Required] public string StorageLocation { get; set; } = string.Empty;
    public decimal? TotalVolume { get; set; }
    public DateTime? RecordsFirstDate { get; set; }
    public DateTime? RecordsLastDate { get; set; }

    public SignatureBlockDto? CreatorUnit { get; set; }
    public SignatureBlockDto? LegalAffairs { get; set; }
    public SignatureBlockDto? InternalAudit { get; set; }
    public SignatureBlockDto? RecordsManagement { get; set; }

    public List<DestructionRecordDto> Records { get; set; } = new();

    /// <summary>True = save as Draft ("Complete Later"); false = Submitted.</summary>
    public bool SaveAsDraft { get; set; }
}

public class DestructionRequestListItemDto
{
    public int Id { get; set; }
    public string? DestructionNo { get; set; }
    public string Department { get; set; } = string.Empty;
    public string ResponsibleOfficer { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public int RecordsCount { get; set; }
    public string? AdminNotes { get; set; }
}

public class DestructionRequestDetailsDto : SaveDestructionRequestDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string? SubmittedByUserId { get; set; }
}

public class UpdateStatusDto
{
    [Required] public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class DashboardDto
{
    public int TotalSubmissions { get; set; }
    public int SubmittedCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int DraftCount { get; set; }
    public List<DestructionRequestListItemDto> RecentSubmissions { get; set; } = new();
}

public class UnitDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public List<UnitDto> Children { get; set; } = new();
}

public class DepartmentDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<UnitDto> Units { get; set; } = new();
}
