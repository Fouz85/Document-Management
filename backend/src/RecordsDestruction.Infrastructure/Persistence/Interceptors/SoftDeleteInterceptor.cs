using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RecordsDestruction.Domain.Common;

namespace RecordsDestruction.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Safety net: converts any accidental hard delete of a BaseEntity into a soft delete.
/// </summary>
public sealed class SoftDeleteInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Convert(eventData);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Convert(eventData);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void Convert(DbContextEventData eventData)
    {
        if (eventData.Context is null) return;
        foreach (var entry in eventData.Context.ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State != EntityState.Deleted) continue;
            entry.State = EntityState.Modified;
            entry.Entity.IsDeleted = true;
            entry.Entity.DeletedAt = DateTime.UtcNow;
        }
    }
}
