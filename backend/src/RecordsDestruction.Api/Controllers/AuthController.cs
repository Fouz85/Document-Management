using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Domain.Enums;
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

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterUserDto dto)
    {
        var existing = await _userManager.FindByEmailAsync(dto.Email);
        if (existing is not null)
            return BadRequest(new { error = "auth.emailInUse" });

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            Department = dto.Department,
            IsActive = false,
            RegistrationStatus = RegistrationStatus.Pending
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Code) });

        // Self-registration is always the "User" role — never trust a client-supplied role here.
        await _userManager.AddToRoleAsync(user, "User");
        return Ok();
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

        // Only reveal registration status once the password is confirmed — avoids leaking status to guessers.
        if (user.RegistrationStatus == RegistrationStatus.Pending)
            return Unauthorized(new { error = "auth.pendingApproval" });
        if (user.RegistrationStatus == RegistrationStatus.Rejected)
            return Unauthorized(new { error = "auth.registrationRejected" });
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

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Code) });
        return NoContent();
    }
}
