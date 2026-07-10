using Microsoft.AspNetCore.Identity;

namespace RecordsDestruction.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Soft delete for users (physical deletion of ministry data is forbidden).
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
