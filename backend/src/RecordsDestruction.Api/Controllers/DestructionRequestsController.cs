using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Application.Services;

namespace RecordsDestruction.Api.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize]
public class DestructionRequestsController : ControllerBase
{
    private readonly DestructionRequestService _service;
    public DestructionRequestsController(DestructionRequestService service) => _service = service;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet("mine")]
    public async Task<ActionResult<List<DestructionRequestListItemDto>>> Mine(string? search, string? status)
        => await _service.ListAsync(UserId, search, status);

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
}
