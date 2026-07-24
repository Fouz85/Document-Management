using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services;

public class PdfServiceAdapter : IPdfService
{
    private readonly WordComHost _wordCom;

    public PdfServiceAdapter(WordComHost wordCom) => _wordCom = wordCom;

    public byte[] GenerateDestructionRequestPdf(DestructionRequest request, string generatedBy, string? approvedBy = null)
    {
        try
        {
            // Render the exact official NAQ template (via the same filled Word document) instead of
            // the custom-styled fallback below, so the PDF matches the template pixel-for-pixel.
            var docxBytes = WordGenerator.GenerateDestructionRequestDocx(request);
            return _wordCom.ConvertToPdfAsync(docxBytes).GetAwaiter().GetResult();
        }
        catch
        {
            // Word is not installed on this machine — fall back to the built-in renderer so the
            // download still works, just without the official template's exact visual layout.
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
}
