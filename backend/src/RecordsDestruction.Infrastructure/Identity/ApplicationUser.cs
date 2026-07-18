using Microsoft.AspNetCore.Identity;

namespace RecordsDestruction.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Self-registered accounts start Pending until an Admin approves/rejects them.
    // Accounts created directly by an Admin default to Approved (no review needed).
    public string RegistrationStatus { get; set; } = Domain.Enums.RegistrationStatus.Approved;

    // Soft delete for users (physical deletion of ministry data is forbidden).
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
