using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services;

public class ExcelExportServiceAdapter : IExcelExportService
{
    public byte[] ExportDestructionSummary(List<DestructionRequest> requests)
        => ExcelGenerator.ExportDestructionSummary(requests);
}
