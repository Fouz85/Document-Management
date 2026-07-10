using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Application.Common.Interfaces;

public interface IExcelExportService
{
    byte[] ExportDestructionSummary(List<DestructionRequest> requests);
}
