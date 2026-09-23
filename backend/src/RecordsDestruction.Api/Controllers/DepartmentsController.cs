using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Application.Services;

namespace RecordsDestruction.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly DepartmentService _service;
    public DepartmentsController(DepartmentService service) => _service = service;

    [HttpGet("tree")]
    public async Task<ActionResult<List<DepartmentDto>>> GetTree() => await _service.GetTreeAsync();
}
