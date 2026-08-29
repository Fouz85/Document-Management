using System.ComponentModel.DataAnnotations;

namespace RecordsDestruction.Application.DTOs;

/// <summary>Anyone can self-register, so this is the only gate on who can log in — restricted to the
/// ministry's own domains.</summary>
public sealed class AllowedEmailDomainAttribute : ValidationAttribute
{
    private static readonly string[] AllowedDomains = { "education.qa", "edu.gov.qa" };

    public AllowedEmailDomainAttribute() : base("Email domain not allowed") { }

    public override bool IsValid(object? value)
    {
        var email = value as string;
        if (string.IsNullOrWhiteSpace(email)) return true; // [Required]/[EmailAddress] handle presence/format
        var at = email.LastIndexOf('@');
        if (at < 0) return true;
        var domain = email[(at + 1)..];
        return AllowedDomains.Any(d => domain.Equals(d, StringComparison.OrdinalIgnoreCase));
    }
}

public class LoginDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

public class AuthResultDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = new List<string>();
}

/// <summary>Self-service sign-up — deliberately just credentials. Name/department are collected right
/// after, on first login, via <see cref="CompleteProfileDto"/> (see AuthController.Register/CompleteProfile).</summary>
public class SelfRegisterDto
{
    [Required, EmailAddress, AllowedEmailDomain] public string Email { get; set; } = string.Empty;
    [Required, MinLength(10)] public string Password { get; set; } = string.Empty;
}

/// <summary>Filled in once, right after a self-registered account's first login.</summary>
public class CompleteProfileDto
{
    [Required] public string FullName { get; set; } = string.Empty;
    [Required] public string Department { get; set; } = string.Empty;
}

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public IList<string> Roles { get; set; } = new List<string>();
}

public class UpdateUserDto
{
    [Required] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress, AllowedEmailDomain] public string Email { get; set; } = string.Empty;
    [Required] public string Department { get; set; } = string.Empty;
    [Required] public string Role { get; set; } = "User";
}
