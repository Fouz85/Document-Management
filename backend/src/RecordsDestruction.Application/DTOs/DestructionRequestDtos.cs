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
public class SaveDestructionRequestDto : IValidatableObject
{
    [Required] public string ConcernedParty { get; set; } = string.Empty;

    // Assigned by the server (see DestructionRequestService.CreateAsync/UpdateAsync) — never
    // trusted from client input — so this carries no validation; any value sent here is ignored.
    public string DestructionNo { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;
    public string ResponsibleOfficer { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    [RegularExpression(@"^(\+974|974)?[34567]\d{7}$")]
    public string Phone { get; set; } = string.Empty;

    public string StorageLocation { get; set; } = string.Empty;
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

    /// <summary>A draft may leave these fields empty (that's the point of "complete later") — but a
    /// final submission needs them filled in. [RegularExpression] (used for Phone/DestructionNo) already
    /// skips empty values on its own, but the built-in [EmailAddress] attribute does NOT — it fails on
    /// an empty string, only skipping a true null — so Email's format is checked here by hand instead,
    /// to apply the same "skip when empty" convention as everything else.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrEmpty(Email) && !new EmailAddressAttribute().IsValid(Email))
            yield return new ValidationResult("Email is not a valid e-mail address", new[] { nameof(Email) });

        if (SaveAsDraft) yield break;

        if (string.IsNullOrWhiteSpace(Department)) yield return new ValidationResult("Department is required", new[] { nameof(Department) });
        if (string.IsNullOrWhiteSpace(ResponsibleOfficer)) yield return new ValidationResult("ResponsibleOfficer is required", new[] { nameof(ResponsibleOfficer) });
        if (string.IsNullOrWhiteSpace(Email)) yield return new ValidationResult("Email is required", new[] { nameof(Email) });
        if (string.IsNullOrWhiteSpace(Phone)) yield return new ValidationResult("Phone is required", new[] { nameof(Phone) });
        if (string.IsNullOrWhiteSpace(StorageLocation)) yield return new ValidationResult("StorageLocation is required", new[] { nameof(StorageLocation) });
        // The Creator Unit's own signature is the one mandatory signature on submit — Legal
        // Affairs/Internal Audit/Records Management are filled in later by other people entirely.
        if (string.IsNullOrWhiteSpace(CreatorUnit?.Signature)) yield return new ValidationResult("CreatorUnit signature is required", new[] { nameof(CreatorUnit) });
    }
}

/// <summary>Legal Affairs / Internal Audit signing their own box on an Approved request — Name and
/// Date are stamped server-side from the authenticated account, never client-supplied (see
/// DestructionRequestService.SignCounterBlockAsync), so only the signature image travels here.</summary>
public class CounterSignatureDto
{
    [Required] public string Signature { get; set; } = string.Empty;
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
    public string? SubmittedByUserId { get; set; }
    public bool IsDestroyed { get; set; }
    /// <summary>Whether each counter-signature block is already filled — used by the "pending my
    /// signature" list so a LegalAffairs/InternalAudit account can tell, without opening the request,
    /// which ones they've already signed (the list itself always includes every Approved request,
    /// signed or not, since a colleague's outstanding signature still matters to see).</summary>
    public bool HasLegalAffairsSignature { get; set; }
    public bool HasInternalAuditSignature { get; set; }
}

public class DestructionRequestDetailsDto : SaveDestructionRequestDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string? SubmittedByUserId { get; set; }
    public bool IsDestroyed { get; set; }
    public DateTime? DestroyedAt { get; set; }
    public string? DestroyedByName { get; set; }
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
