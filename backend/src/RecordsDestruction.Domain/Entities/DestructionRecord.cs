using RecordsDestruction.Domain.Common;

namespace RecordsDestruction.Domain.Entities;

public class DestructionRecord : BaseEntity
{
    public int DestructionRequestId { get; set; }
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
    public DestructionRequest? DestructionRequest { get; set; }
}
