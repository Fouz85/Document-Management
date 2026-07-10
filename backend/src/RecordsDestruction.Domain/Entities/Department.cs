using RecordsDestruction.Domain.Common;

namespace RecordsDestruction.Domain.Entities;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public ICollection<SubDepartment> SubDepartments { get; set; } = new List<SubDepartment>();
}
