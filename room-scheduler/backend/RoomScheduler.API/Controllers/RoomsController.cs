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
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        var room = await _db.Rooms
            .Include(r => r.SoftwarePackages)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room == null) return NotFound();
        return Ok(room);
    }

    // GET /api/rooms/search — filterable, sortable, paged room list for the admin management page
    [HttpGet("search")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Search(
        string? search,
        int? minSeats,
        string? softwarePackage,
        string? status,
        string? sortBy = "name",
        string? sortDir = "asc",
        int page = 1,
        int pageSize = 20)
    {
        var query = _db.Rooms.Include(r => r.SoftwarePackages).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(r => EF.Functions.ILike(r.Name, pattern));
        }

        if (minSeats.HasValue)
            query = query.Where(r => r.Seats >= minSeats.Value);

        if (!string.IsNullOrWhiteSpace(softwarePackage))
            query = query.Where(r => r.SoftwarePackages.Any(p => p.Name == softwarePackage));

        if (status == "active")
            query = query.Where(r => r.IsActive);
        else if (status == "inactive")
            query = query.Where(r => !r.IsActive);

        var totalCount = await query.CountAsync();

        var descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy switch
        {
            "seats" => descending ? query.OrderByDescending(r => r.Seats) : query.OrderBy(r => r.Seats),
            "status" => descending ? query.OrderByDescending(r => r.IsActive) : query.OrderBy(r => r.IsActive),
            _ => descending ? query.OrderByDescending(r => r.Name) : query.OrderBy(r => r.Name),
        };

        // pageSize <= 0 (e.g. -1) means "All" — skip paging entirely
        if (pageSize > 0)
            query = query.Skip((Math.Max(page, 1) - 1) * pageSize).Take(pageSize);

        var rooms = await query
            .Select(r => new {
                id = r.Id,
                name = r.Name,
                seats = r.Seats,
                description = r.Description,
                isActive = r.IsActive,
                softwarePackages = r.SoftwarePackages.Select(p => new { id = p.Id, name = p.Name }).ToList()
            })
            .ToListAsync();

        return Ok(new { items = rooms, totalCount, page, pageSize });
    }

    // GET /api/rooms/software-packages — distinct package names for the filter dropdown
    [HttpGet("software-packages")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetSoftwarePackageNames()
    {
        var names = await _db.SoftwarePackages
            .Select(p => p.Name)
            .Distinct()
            .OrderBy(n => n)
            .ToListAsync();

        return Ok(names);
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

    // PUT /api/rooms/5/reactivate — admin only, undo a soft delete
    [HttpPut("{id}/reactivate")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reactivate(int id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room == null) return NotFound();

        room.IsActive = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record RoomDto(
    string Name,
    int Seats,
    string? Description,
    List<string>? SoftwarePackages);