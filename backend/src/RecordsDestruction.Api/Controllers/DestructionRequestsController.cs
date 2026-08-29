using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Application.Services;

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

    [HttpGet("mine")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> Mine(string? search, string? status)
        => await _service.ListAsync(UserId, search, status);

    [HttpGet("next-destruction-no")]
    public async Task<ActionResult<object>> NextDestructionNo()
        => new { destructionNo = await _service.GetNextDestructionNoAsync() };

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DestructionRequestDetailsDto>> Get(int id)
    {
        var dto = await _service.GetAsync(id, IsAdmin ? null : UserId);
        return dto is null ? NotFound() : dto;
    }

    [HttpPost]
    public async Task<ActionResult> Create(SaveDestructionRequestDto dto)
    {
        var id = await _service.CreateAsync(dto, UserId);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveDestructionRequestDto dto)
        => await _service.UpdateAsync(id, dto, UserId, IsAdmin) ? NoContent() : NotFound();

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
        if (!IsAdmin && request.SubmittedByUserId != UserId) return null;
        return request;
    }

    private static string FileSafeNo(Domain.Entities.DestructionRequest r) =>
        (r.DestructionNo ?? r.Id.ToString()).Replace('\\', '-').Replace('/', '-');
}
