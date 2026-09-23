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
    public async Task<ActionResult<DashboardDto>> Dashboard() => await _requests.GetDashboardAsync();

    [HttpGet("submissions")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> Submissions(string? search, string? status)
        => await _requests.ListAsync(null, search, status);

    [HttpPut("submissions/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto dto)
        => await _requests.UpdateStatusAsync(id, dto.Status, dto.Notes) ? NoContent() : NotFound();

    /// <summary>Toggles whether the physical destruction has actually taken place — only valid for
    /// an Approved request. Once marked, it drops out of the "كشف الإتلاف" Excel export.</summary>
    [HttpPost("submissions/{id:int}/toggle-destroyed")]
    public async Task<IActionResult> ToggleDestroyed(int id)
    {
        var adminName = User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Email) ?? "System";
        var result = await _requests.ToggleDestroyedAsync(id, adminName);
        return result is null ? NotFound() : Ok(new { isDestroyed = result.Value });
    }

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
        // Only approved requests represent an actual, decided destruction — drafts, pending, and
        // rejected requests have no business appearing in the official summary. Already-destroyed
        // approved requests have nothing left to submit for destruction — leave those out too.
        var requests = await _db.DestructionRequests
            .Include(r => r.Records.Where(x => !x.IsDeleted))
            .AsNoTracking()
            .Where(r => r.Status == RequestStatus.Approved && !r.IsDestroyed)
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
                IsActive = u.IsActive, Roles = await _userManager.GetRolesAsync(u)
            });
        return list;
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

        // Explicit allow-list, not a deny-list collapsing anything unrecognized to "User" — that
        // silently demoted the dedicated LegalAffairs/InternalAudit accounts on any unrelated
        // profile edit (e.g. fixing a typo in their name) with no error, quietly breaking the
        // signing workflow.
        var roles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, roles);
        var allowedRoles = new[] { "Admin", "User", "LegalAffairs", "InternalAudit" };
        await _userManager.AddToRoleAsync(user, allowedRoles.Contains(dto.Role) ? dto.Role : "User");

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
