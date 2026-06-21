using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using RoomScheduler.API.Data;
using RoomScheduler.API.Models;
using RoomScheduler.API.Resources;
using RoomScheduler.API.Services;
using System.Security.Claims;


namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    public BookingsController(
        AppDbContext db,
        IEmailService emailService,
        IStringLocalizer<SharedResource> localizer)
    {
        _db = db;
        _emailService = emailService;
        _localizer = localizer;
    }

    // GET /api/bookings
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);// nije jasno

        var bookings = await _db.Bookings// nije jasno
            .Include(b => b.Room)// Spoji sa tabelom ROOMS (Eager Loading)
            .Include(b => b.User)// Spiji sa tabelom AspNetUsers (Eager Loading)
            .Select(b => new {
                id = b.Id,
                roomId = b.RoomId,
                roomName = b.Room.Name,
                userId = b.UserId,
                userName = b.User.FullName,
                start = b.Start,
                end = b.End,
                notes = b.Notes,
                isCancelled = b.IsCancelled,
                occasionType = b.OccasionType,
                occasionTypeLabel = b.OccasionType.ToString(),
                recurringGroupId = b.RecurringGroupId,
                isOwn = b.UserId == currentUserId,
                departmentLabel = b.User.Department.HasValue ? b.User.Department.Value.ToString() : null
            })
            .ToListAsync();// Deferred execution tek ovde

        return Ok(bookings);
    }

    // GET /api/bookings/my
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
                isCancelled = b.IsCancelled,
                occasionType = b.OccasionType,
                occasionTypeLabel = b.OccasionType.ToString(),
                recurringGroupId = b.RecurringGroupId,
                isRecurringRoot = b.IsRecurringRoot
            })
            .ToListAsync();

        return Ok(bookings);
    }

    // POST /api/bookings
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingDto dto)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);// nije jasno
        var isProfessor = User.IsInRole("Professor");
        var isAssistant = User.IsInRole("Assistant");

        if (User.IsInRole("User"))
            return Forbid();

        // Role-based occasion type restrictions
        if (isAssistant &&
            dto.OccasionType != OccasionType.LabVezbe)
            return Forbid();

        if (isProfessor &&
            dto.OccasionType == OccasionType.LabVezbe)
            return Forbid();   

        // Check room exists
        var room = await _db.Rooms.FindAsync(dto.RoomId);
        if (room == null || !room.IsActive)
            return BadRequest(_localizer["RoomNotFoundOrInactive"].Value);

        // Generate all dates for the series
        var dates = GenerateDates(dto.Start, dto.End,
            dto.RecurrencePattern, dto.RecurrenceEndDate);

        // Check ALL dates for conflicts before creating any
        var conflictingDates = new List<DateTime>();
        foreach (var (start, end) in dates)
        {
            var conflict = await _db.Bookings.AnyAsync(b =>
                b.RoomId == dto.RoomId &&
                !b.IsCancelled &&
                b.Start < end &&
                b.End > start);

            if (conflict) conflictingDates.Add(start);// nije jasno
        }

        if (conflictingDates.Count > 0)
        {
            return Conflict(new {
                message = _localizer["ConflictsFoundMessage"].Value,
                conflictingDates = conflictingDates
                    .Select(d => d.ToString("yyyy-MM-dd HH:mm"))
                    .ToList()
            });
        }

        // Create all bookings
        var groupId = dates.Count > 1 ? Guid.NewGuid() : (Guid?)null;
        var bookings = dates.Select((datePair, index) => new Booking {
            RoomId = dto.RoomId,
            UserId = currentUserId!,
            Start = datePair.start,
            End = datePair.end,
            Notes = dto.Notes,
            OccasionType = dto.OccasionType,
            RecurringGroupId = groupId,
            IsRecurringRoot = index == 0,
            RecurrencePattern = index == 0 ? dto.RecurrencePattern : null,
            RecurrenceEndDate = index == 0 ? dto.RecurrenceEndDate : null
        }).ToList();

        _db.Bookings.AddRange(bookings);
        await _db.SaveChangesAsync();

        return Ok(new {
            count = bookings.Count,
            recurringGroupId = groupId
        });
    }

    // DELETE /api/bookings/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

        var booking = await _db.Bookings
            .Include(b => b.User)
            .Include(b => b.Room)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (booking.UserId != currentUserId && !isAdmin)
            return Forbid();

        // If recurring, cancel all future bookings in the group
        if (booking.RecurringGroupId.HasValue)
        {
            var now = DateTime.UtcNow;
            var group = await _db.Bookings
                .Where(b => b.RecurringGroupId == booking.RecurringGroupId &&
                           b.Start >= now &&
                           !b.IsCancelled)
                .ToListAsync();
            foreach (var b in group)
                b.IsCancelled = true;
        }
        else
        {
            booking.IsCancelled = true;
        }

        await _db.SaveChangesAsync();

        // Notify owner if cancelled by admin
        if (isAdmin && booking.UserId != currentUserId && booking.User.Email != null)
            await _emailService.SendBookingCancelledEmailAsync(
                booking.User.Email,
                booking.User.FullName,
                booking.Room.Name,
                booking.Start
            );

        return NoContent();
    }

    // PUT /api/bookings/{id}/restore — un-cancel a cancelled booking
    [HttpPut("{id}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (booking.UserId != currentUserId && !isAdmin)
            return Forbid();
        if (!booking.IsCancelled)
            return BadRequest(_localizer["BookingNotCancelled"].Value);

        var conflict = await _db.Bookings.AnyAsync(b =>
            b.Id != id &&
            b.RoomId == booking.RoomId &&
            !b.IsCancelled &&
            b.Start < booking.End &&
            b.End > booking.Start);

        if (conflict)
            return Conflict(new { message = _localizer["ConflictsFoundMessage"].Value });

        booking.IsCancelled = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Helper — generate all dates for a recurring series
    private static List<(DateTime start, DateTime end)> GenerateDates(
        DateTime start,
        DateTime end,
        RecurrencePattern? pattern,
        DateTime? recurrenceEndDate)
    {
        var dates = new List<(DateTime, DateTime)> { (start, end) };

        if (pattern == null || recurrenceEndDate == null)
            return dates;

        var duration = end - start;
        var current = start;
        var limit = recurrenceEndDate.Value;

        while (true)
        {
            current = pattern switch {
                RecurrencePattern.Weekly => current.AddDays(7), // nije jasno
                RecurrencePattern.BiWeekly => current.AddDays(14),// nije jasno
                RecurrencePattern.Monthly => current.AddMonths(1),// nije jasno
                _ => limit.AddDays(1) // exit // nije jasno
            };

            if (current > limit) break;// nije jasno
            dates.Add((current, current + duration));// nije jasno
        }

        return dates;
    }
}

public record CreateBookingDto(
    int RoomId,
    DateTime Start,
    DateTime End,
    OccasionType OccasionType,
    string? Notes,
    RecurrencePattern? RecurrencePattern,
    DateTime? RecurrenceEndDate);