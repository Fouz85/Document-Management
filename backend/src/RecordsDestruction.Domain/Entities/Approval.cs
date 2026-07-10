using RecordsDestruction.Domain.Common;

namespace RecordsDestruction.Domain.Entities;

public class Approval : BaseEntity
{
    public int DestructionRequestId { get; set; }
    public string ApproverRole { get; set; } = string.Empty;
    public string ApproverName { get; set; } = string.Empty;
    public string? ApproverUserId { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Comments { get; set; }
    public DateTime? ActionDate { get; set; }
    public DestructionRequest? DestructionRequest { get; set; }
}
