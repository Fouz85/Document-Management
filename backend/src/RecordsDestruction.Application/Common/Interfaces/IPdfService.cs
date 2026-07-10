using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Application.Common.Interfaces;

public interface IPdfService
{
    byte[] GenerateDestructionRequestPdf(DestructionRequest request, string generatedBy, string? approvedBy = null);
}
