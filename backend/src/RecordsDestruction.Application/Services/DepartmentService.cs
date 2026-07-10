using Microsoft.EntityFrameworkCore;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.DTOs;

namespace RecordsDestruction.Application.Services;

public class DepartmentService
{
    private readonly IApplicationDbContext _db;
    public DepartmentService(IApplicationDbContext db) => _db = db;

    /// <summary>Full hierarchical tree: Department → SubDepartment → nested children.</summary>
    public async Task<List<DepartmentDto>> GetTreeAsync()
    {
        var departments = await _db.Departments.AsNoTracking().OrderBy(d => d.Id).ToListAsync();
        var subs = await _db.SubDepartments.AsNoTracking().OrderBy(s => s.Id).ToListAsync();

        var byId = subs.ToDictionary(s => s.Id, s => new UnitDto { Id = s.Id, Name = s.Name, ParentId = s.ParentId });
        foreach (var s in subs.Where(s => s.ParentId.HasValue))
            if (byId.TryGetValue(s.ParentId!.Value, out var parent))
                parent.Children.Add(byId[s.Id]);

        return departments.Select(d => new DepartmentDto
        {
            Id = d.Id,
            Name = d.Name,
            Units = subs.Where(s => s.DepartmentId == d.Id && s.ParentId == null)
                        .Select(s => byId[s.Id]).ToList()
        }).ToList();
    }
}
