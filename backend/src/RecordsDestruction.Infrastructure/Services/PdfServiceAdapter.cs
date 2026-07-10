using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services;

public class PdfServiceAdapter : IPdfService
{
    public byte[] GenerateDestructionRequestPdf(DestructionRequest request, string generatedBy, string? approvedBy = null)
    {
        var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "Ministrylogo.png");
        var calligraphyPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "calligraphy.png");
        return PdfGenerator.GenerateDestructionRequestPdf(
            request,
            File.Exists(logoPath) ? logoPath : null,
            File.Exists(calligraphyPath) ? calligraphyPath : null,
            generatedBy,
            approvedBy);
    }
}
