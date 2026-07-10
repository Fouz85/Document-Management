using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Application.Services;
using RecordsDestruction.Infrastructure.Identity;

namespace RecordsDestruction.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly DestructionRequestService _requests;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IApplicationDbContext _db;
    private readonly IPdfService _pdf;
    private readonly IExcelExportService _excel;

    public AdminController(DestructionRequestService requests, UserManager<ApplicationUser> userManager,
        IApplicationDbContext db, IPdfService pdf, IExcelExportService excel)
    {
        _requests = requests;
        _userManager = userManager;
        _db = db;
        _pdf = pdf;
        _excel = excel;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> Dashboard() => await _requests.GetDashboardAsync();

    [HttpGet("submissions")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> Submissions(string? search, string? status)
        => await _requests.ListAsync(null, search, status);

    [HttpPut("submissions/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto dto)
        => await _requests.UpdateStatusAsync(id, dto.Status, dto.Notes) ? NoContent() : NotFound();

    /// <summary>Soft delete — the row stays in the database (audit & PDPPL).</summary>
    [HttpDelete("submissions/{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => await _requests.SoftDeleteAsync(id) ? NoContent() : NotFound();

    [HttpGet("submissions/{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var request = await _db.DestructionRequests
            .Include(r => r.Records.Where(x => !x.IsDeleted))
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return NotFound();

        var generatedBy = User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Email) ?? "System";
        var bytes = _pdf.GenerateDestructionRequestPdf(request, generatedBy);
        return File(bytes, "application/pdf", $"destruction-request-{id}.pdf");
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel()
    {
        var requests = await _db.DestructionRequests
            .Include(r => r.Records.Where(x => !x.IsDeleted))
            .AsNoTracking()
            .OrderByDescending(r => r.SubmittedAt)
            .ToListAsync();
        var bytes = _excel.ExportDestructionSummary(requests);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "destruction-summary.xlsx");
    }

    // ---------- Users ----------

    [HttpGet("users")]
    public async Task<ActionResult<List<UserDto>>> Users()
    {
        var users = await _userManager.Users.AsNoTracking().OrderBy(u => u.FullName).ToListAsync();
        var list = new List<UserDto>();
        foreach (var u in users)
            list.Add(new UserDto
            {
                Id = u.Id, FullName = u.FullName, Email = u.Email ?? "", Department = u.Department,
                IsActive = u.IsActive, Roles = await _userManager.GetRolesAsync(u)
            });
        return list;
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(RegisterUserDto dto)
    {
        var user = new ApplicationUser
        {
            UserName = dto.Email, Email = dto.Email,
            FullName = dto.FullName, Department = dto.Department, IsActive = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors.Select(e => e.Code) });
        await _userManager.AddToRoleAsync(user, dto.Role == "Admin" ? "Admin" : "User");
        return Ok(new { user.Id });
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, UpdateUserDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.UserName = dto.Email;
        user.Department = dto.Department;
        await _userManager.UpdateAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, roles);
        await _userManager.AddToRoleAsync(user, dto.Role == "Admin" ? "Admin" : "User");

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var reset = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            if (!reset.Succeeded) return BadRequest(new { errors = reset.Errors.Select(e => e.Code) });
        }
        return NoContent();
    }

    /// <summary>Soft delete + deactivate — Identity rows are never physically removed.</summary>
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpPost("users/{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        user.IsActive = !user.IsActive;
        await _userManager.UpdateAsync(user);
        return Ok(new { user.IsActive });
    }
}
