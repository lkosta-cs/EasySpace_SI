using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Data;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/rooms — any logged in user can see rooms
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll()
    {
        var rooms = await _db.Rooms
            .Include(r => r.SoftwarePackages)
            .Where(r => r.IsActive)
            .ToListAsync();

        return Ok(rooms);
    }

    // GET /api/rooms/5 — get a single room by id
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        var room = await _db.Rooms
            .Include(r => r.SoftwarePackages)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room == null) return NotFound();
        return Ok(room);
    }

    // POST /api/rooms — admin only
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] RoomDto dto)
    {
        var room = new Room {
            Name = dto.Name,
            Seats = dto.Seats,
            Description = dto.Description,
            IsActive = true
        };

        if (dto.SoftwarePackages != null)
        {
            room.SoftwarePackages = dto.SoftwarePackages
                .Select(name => new SoftwarePackage { Name = name })
                .ToList();
        }

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = room.Id }, room);
    }

    // PUT /api/rooms/5 — admin only
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] RoomDto dto)
    {
        var room = await _db.Rooms
            .Include(r => r.SoftwarePackages)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room == null) return NotFound();

        room.Name = dto.Name;
        room.Seats = dto.Seats;
        room.Description = dto.Description;

        // Replace software packages
        room.SoftwarePackages.Clear();
        if (dto.SoftwarePackages != null)
        {
            room.SoftwarePackages = dto.SoftwarePackages
                .Select(name => new SoftwarePackage { Name = name })
                .ToList();
        }

        await _db.SaveChangesAsync();
        return Ok(room);
    }

    // DELETE /api/rooms/5 — admin only, soft delete
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null) return NotFound();

        room.IsActive = false; // soft delete - keeps historical booking data
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record RoomDto(
    string Name,
    int Seats,
    string? Description,
    List<string>? SoftwarePackages);