using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Application.Services;
using RecordsDestruction.Domain.Enums;
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
    public async Task<ActionResult<DashboardDto>> Dashboard()
    {
        var dashboard = await _requests.GetDashboardAsync();
        await ResolveCurrentOfficerNames(dashboard.RecentSubmissions);
        return dashboard;
    }

    [HttpGet("submissions")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> Submissions(string? search, string? status)
    {
        var items = await _requests.ListAsync(null, search, status);
        await ResolveCurrentOfficerNames(items);
        return items;
    }

    /// <summary>"الموظف المسؤول" is captured on the request at submission time, so if an admin later
    /// corrects a user's name via Users Management, older requests still hold the old snapshot.
    /// Overlay the submitter's current account name here so list views always show up-to-date names.</summary>
    private async Task ResolveCurrentOfficerNames(IEnumerable<DestructionRequestListItemDto> items)
    {
        var ids = items.Select(i => i.SubmittedByUserId).Where(id => id is not null).Distinct().ToList();
        if (ids.Count == 0) return;
        var names = await _userManager.Users.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);
        foreach (var item in items)
            if (item.SubmittedByUserId is not null && names.TryGetValue(item.SubmittedByUserId, out var name))
                item.ResponsibleOfficer = name;
    }

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
        var noPart = (request.DestructionNo ?? id.ToString()).Replace('\\', '-').Replace('/', '-');
        return File(bytes, "application/pdf", $"استمارة إتلاف رقم {noPart}.pdf");
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
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"كشف الإتلاف بتاريخ {DateTime.Now:yyyy-MM-dd}.xlsx");
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
                IsActive = u.IsActive, RegistrationStatus = u.RegistrationStatus, Roles = await _userManager.GetRolesAsync(u)
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

    [HttpPost("users/{id}/approve")]
    public async Task<IActionResult> ApproveRegistration(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        user.RegistrationStatus = RegistrationStatus.Approved;
        user.IsActive = true;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpPost("users/{id}/reject")]
    public async Task<IActionResult> RejectRegistration(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        user.RegistrationStatus = RegistrationStatus.Rejected;
        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

}
