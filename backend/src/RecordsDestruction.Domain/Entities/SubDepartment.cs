using RecordsDestruction.Domain.Common;

namespace RecordsDestruction.Domain.Entities;

public class SubDepartment : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public Department? Department { get; set; }
    public int? ParentId { get; set; }
    public SubDepartment? Parent { get; set; }
    public ICollection<SubDepartment> Children { get; set; } = new List<SubDepartment>();
}
