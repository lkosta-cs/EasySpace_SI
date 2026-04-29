using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Data;
using RoomScheduler.API.Models;
using System.Security.Claims;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public BookingsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/bookings — returns all bookings for the calendar
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var bookings = await _db.Bookings
            .Include(b => b.Room)
            .Include(b => b.User)
            .Where(b => b.Status == BookingStatus.Confirmed)
            .Select(b => new {
                id = b.Id,
                roomId = b.RoomId,
                roomName = b.Room.Name,
                userId = b.UserId,
                userName = b.User.FullName,
                start = b.Start,
                end = b.End,
                notes = b.Notes,
                isOwn = b.UserId == currentUserId
            })
            .ToListAsync();

        return Ok(bookings);
    }

    // GET /api/bookings/my — returns only the current user's bookings
    [HttpGet("my")]
    public async Task<IActionResult> GetMine()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var bookings = await _db.Bookings
            .Include(b => b.Room)
            .Where(b => b.UserId == currentUserId)
            .OrderByDescending(b => b.Start)
            .Select(b => new {
                id = b.Id,
                roomId = b.RoomId,
                roomName = b.Room.Name,
                start = b.Start,
                end = b.End,
                notes = b.Notes,
                status = b.Status.ToString()
            })
            .ToListAsync();

        return Ok(bookings);
    }

    // POST /api/bookings — create a new booking
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingDto dto)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Check user has permission to book this room
        var permission = await _db.RoomPermissions
            .FirstOrDefaultAsync(p =>
                p.UserId == currentUserId &&
                p.RoomId == dto.RoomId &&
                p.Level == PermissionLevel.CanBook);

        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin && permission == null)
            return Forbid();

        // Check room exists and is active
        var room = await _db.Rooms.FindAsync(dto.RoomId);
        if (room == null || !room.IsActive)
            return BadRequest("Room not found or inactive");

        // Check for time conflicts
        var conflict = await _db.Bookings.AnyAsync(b =>
            b.RoomId == dto.RoomId &&
            b.Status == BookingStatus.Confirmed &&
            b.Start < dto.End &&
            b.End > dto.Start);

        if (conflict)
            return Conflict("Room is already booked for this time slot");

        var booking = new Booking {
            RoomId = dto.RoomId,
            UserId = currentUserId!,
            Start = dto.Start,
            End = dto.End,
            Notes = dto.Notes,
            Status = BookingStatus.Confirmed
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();
        return Ok(new { booking.Id });
    }

    // DELETE /api/bookings/5 — cancel a booking
    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Admin");

        var booking = await _db.Bookings.FindAsync(id);
        if (booking == null) return NotFound();

        // Only the owner or an admin can cancel
        if (booking.UserId != currentUserId && !isAdmin)
            return Forbid();

        booking.Status = BookingStatus.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateBookingDto(
    int RoomId,
    DateTime Start,
    DateTime End,
    string? Notes);