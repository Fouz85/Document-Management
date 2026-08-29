using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Infrastructure.Identity;
using RecordsDestruction.Infrastructure.Services;

namespace RecordsDestruction.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly JwtTokenService _jwt;

    public AuthController(UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager, JwtTokenService jwt)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwt = jwt;
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResultDto>> Login(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        // Uniform error: don't reveal whether the account exists (OWASP).
        if (user is null)
            return Unauthorized(new { error = "auth.invalidCredentials" });

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
            return Unauthorized(new { error = "auth.invalidCredentials" });

        if (!user.IsActive)
            return Unauthorized(new { error = "auth.invalidCredentials" });

        var roles = await _userManager.GetRolesAsync(user);
        var (token, expires) = _jwt.CreateToken(user, roles);
        return new AuthResultDto
        {
            Token = token,
            ExpiresAtUtc = expires,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Department = user.Department,
            Roles = roles
        };
    }

    /// <summary>Self-service sign-up — no admin approval. FullName/Department stay blank until the
    /// user fills them in via CompleteProfile right after their first login.</summary>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResultDto>> Register(SelfRegisterDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            IsActive = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Code) });

        await _userManager.AddToRoleAsync(user, "User");

        var roles = await _userManager.GetRolesAsync(user);
        var (token, expires) = _jwt.CreateToken(user, roles);
        return new AuthResultDto
        {
            Token = token,
            ExpiresAtUtc = expires,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Department = user.Department,
            Roles = roles
        };
    }

    /// <summary>The logged-in user filling in their own name/department — not an admin action.
    /// Re-issues the token since FullName is baked into its claims (see JwtTokenService).</summary>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<AuthResultDto>> CompleteProfile(CompleteProfileDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();

        user.FullName = dto.FullName;
        user.Department = dto.Department;
        await _userManager.UpdateAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var (token, expires) = _jwt.CreateToken(user, roles);
        return new AuthResultDto
        {
            Token = token,
            ExpiresAtUtc = expires,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Department = user.Department,
            Roles = roles
        };
    }
}
