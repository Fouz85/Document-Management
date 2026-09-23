using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Application.Services;
using RecordsDestruction.Domain.Enums;

namespace RecordsDestruction.Api.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize]
public class DestructionRequestsController : ControllerBase
{
    private readonly DestructionRequestService _service;
    private readonly IApplicationDbContext _db;
    private readonly IPdfService _pdf;
    private readonly IWordService _word;

    public DestructionRequestsController(DestructionRequestService service, IApplicationDbContext db,
        IPdfService pdf, IWordService word)
    {
        _service = service;
        _db = db;
        _pdf = pdf;
        _word = word;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsAdmin => User.IsInRole("Admin");
    private bool IsCounterSigner => User.IsInRole("LegalAffairs") || User.IsInRole("InternalAudit");

    [HttpGet("mine")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> Mine(string? search, string? status)
        => await _service.ListAsync(UserId, search, status);

    // Legal Affairs / Internal Audit only ever act on requests the Admin has already approved —
    // this is their equivalent of "mine": what's currently waiting on their signature.
    [HttpGet("pending-signature")]
    [Authorize(Roles = "LegalAffairs,InternalAudit")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> PendingSignature()
        => await _service.ListAsync(userId: null, search: null, status: RequestStatus.Approved);

    [HttpGet("next-destruction-no")]
    public async Task<ActionResult<object>> NextDestructionNo()
        => new { destructionNo = await _service.GetNextDestructionNoAsync() };

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DestructionRequestDetailsDto>> Get(int id)
    {
        var dto = await _service.GetAsync(id, (IsAdmin || IsCounterSigner) ? null : UserId);
        if (dto is null) return NotFound();
        // Legal Affairs / Internal Audit never had a hand in this request before it was approved —
        // they shouldn't be able to browse Draft/Submitted/Rejected requests belonging to others.
        if (IsCounterSigner && !IsAdmin && dto.Status != RequestStatus.Approved) return NotFound();
        return dto;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,User")]
    public async Task<ActionResult> Create(SaveDestructionRequestDto dto)
    {
        var id = await _service.CreateAsync(dto, UserId, IsAdmin);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,User")]
    public async Task<IActionResult> Update(int id, SaveDestructionRequestDto dto)
        => await _service.UpdateAsync(id, dto, UserId, IsAdmin) ? NoContent() : NotFound();

    // Legal Affairs / Internal Audit sign their own box only, once the request is Approved — the
    // block is derived from the caller's role (never client-supplied), and Name/Date are stamped
    // server-side from the authenticated account, not typed by the signer (see SignCounterBlockAsync).
    [HttpPut("{id:int}/counter-signature")]
    [Authorize(Roles = "LegalAffairs,InternalAudit")]
    public async Task<IActionResult> SignCounterSignature(int id, CounterSignatureDto dto)
    {
        var block = User.IsInRole("LegalAffairs") ? "LegalAffairs" : "InternalAudit";
        var signerName = User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Email) ?? "System";
        return await _service.SignCounterBlockAsync(id, block, signerName, dto.Signature) ? NoContent() : NotFound();
    }

    // A regular user may only delete their own drafts — once submitted, it's no longer theirs
    // alone to remove (admin's own "submissions/{id}" delete endpoint has no such restriction).
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => await _service.SoftDeleteAsync(id, IsAdmin ? null : UserId) ? NoContent() : NotFound();

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var request = await LoadOwnedRequest(id);
        if (request is null) return NotFound();

        var generatedBy = User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Email) ?? "System";
        var bytes = _pdf.GenerateDestructionRequestPdf(request, generatedBy);
        return File(bytes, "application/pdf", $"استمارة إتلاف رقم {FileSafeNo(request)}.pdf");
    }

    [HttpGet("{id:int}/docx")]
    public async Task<IActionResult> DownloadDocx(int id)
    {
        var request = await LoadOwnedRequest(id);
        if (request is null) return NotFound();

        var bytes = _word.GenerateDestructionRequestDocx(request);
        return File(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            $"استمارة إتلاف رقم {FileSafeNo(request)}.docx");
    }

    private async Task<Domain.Entities.DestructionRequest?> LoadOwnedRequest(int id)
    {
        var request = await _db.DestructionRequests
            .Include(r => r.Records.Where(x => !x.IsDeleted))
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return null;
        if (IsAdmin) return request;
        if (IsCounterSigner) return request.Status == RequestStatus.Approved ? request : null;
        return request.SubmittedByUserId == UserId ? request : null;
    }

    private static string FileSafeNo(Domain.Entities.DestructionRequest r) =>
        (r.DestructionNo ?? r.Id.ToString()).Replace('\\', '-').Replace('/', '-');
}
