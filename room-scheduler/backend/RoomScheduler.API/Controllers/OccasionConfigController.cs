using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Data;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OccasionConfigController : ControllerBase
{
    private readonly AppDbContext _db;

    public OccasionConfigController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/OccasionConfig — public, used by frontend for colors
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll()
    {
        var configs = await _db.OccasionTypeConfigs
            .OrderBy(c => c.OccasionType)
            .Select(c => new {
                id = c.Id,
                occasionType = c.OccasionType,
                label = c.Label,
                color = c.Color,
                pendingColor = c.PendingColor,
                requiresApproval = c.RequiresApproval
            })
            .ToListAsync();

        return Ok(configs);
    }

    // PUT /api/OccasionConfig/{type} — admin/superadmin only
    [HttpPut("{type}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int type, [FromBody] OccasionConfigDto dto)
    {
        var config = await _db.OccasionTypeConfigs
            .FirstOrDefaultAsync(c => (int)c.OccasionType == type);

        if (config == null) return NotFound();

        config.Color = dto.Color;
        config.PendingColor = dto.PendingColor;
        config.RequiresApproval = dto.RequiresApproval;

        await _db.SaveChangesAsync();
        return Ok(config);
    }
}

public record OccasionConfigDto(
    string Color,
    string PendingColor,
    bool RequiresApproval);