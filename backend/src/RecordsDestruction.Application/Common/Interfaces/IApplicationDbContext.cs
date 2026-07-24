using Microsoft.EntityFrameworkCore;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Department> Departments { get; }
    DbSet<SubDepartment> SubDepartments { get; }
    DbSet<DestructionRequest> DestructionRequests { get; }
    DbSet<DestructionRecord> DestructionRecords { get; }
    DbSet<Approval> Approvals { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
