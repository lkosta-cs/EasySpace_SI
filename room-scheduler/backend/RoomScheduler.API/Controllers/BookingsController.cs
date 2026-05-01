using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Data;
using RoomScheduler.API.Models;
using RoomScheduler.API.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;


namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly UserManager<ApplicationUser> _userManager;

    public BookingsController(
        AppDbContext db,
        IEmailService emailService,
        UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _emailService = emailService;
        _userManager = userManager;
    }

    // GET /api/bookings
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var bookings = await _db.Bookings
            .Include(b => b.Room)
            .Include(b => b.User)
            .Where(b => b.Status != BookingStatus.Cancelled &&
                       b.Status != BookingStatus.Rejected)
            .Select(b => new {
                id = b.Id,
                roomId = b.RoomId,
                roomName = b.Room.Name,
                userId = b.UserId,
                userName = b.User.FullName,
                start = b.Start,
                end = b.End,
                notes = b.Notes,
                status = b.Status.ToString(),
                occasionType = b.OccasionType,
                occasionTypeLabel = b.OccasionType.ToString(),
                recurringGroupId = b.RecurringGroupId,
                isOwn = b.UserId == currentUserId
            })
            .ToListAsync();

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
                status = b.Status.ToString(),
                occasionType = b.OccasionType,
                occasionTypeLabel = b.OccasionType.ToString(),
                recurringGroupId = b.RecurringGroupId,
                isRecurringRoot = b.IsRecurringRoot
            })
            .ToListAsync();

        return Ok(bookings);
    }

    // GET /api/bookings/pending
    [HttpGet("pending")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetPending()
    {
        var bookings = await _db.Bookings
            .Include(b => b.Room)
            .Include(b => b.User)
            .Where(b => b.Status == BookingStatus.Pending)
            .OrderBy(b => b.Start)
            .Select(b => new {
                id = b.Id,
                roomId = b.RoomId,
                roomName = b.Room.Name,
                userId = b.UserId,
                userName = b.User.FullName,
                userEmail = b.User.Email,
                start = b.Start,
                end = b.End,
                notes = b.Notes,
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
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
        var isProfessor = User.IsInRole("Professor");
        var isAssistant = User.IsInRole("Assistant");

        // Role-based occasion type restrictions
        if (isAssistant &&
            dto.OccasionType != OccasionType.LabVezbe)
            return Forbid();

        if (isProfessor &&
            dto.OccasionType == OccasionType.LabVezbe)
            return Forbid();

        // Check room permission
        if (!isAdmin)
        {
            var permission = await _db.RoomPermissions
                .FirstOrDefaultAsync(p =>
                    p.UserId == currentUserId &&
                    p.RoomId == dto.RoomId &&
                    p.Level == PermissionLevel.CanBook);

            if (permission == null) return Forbid();
        }

        // Check room exists
        var room = await _db.Rooms.FindAsync(dto.RoomId);
        if (room == null || !room.IsActive)
            return BadRequest("Room not found or inactive");

        // Get occasion config
        var config = await _db.OccasionTypeConfigs
            .FirstOrDefaultAsync(c => c.OccasionType == dto.OccasionType);

        var requiresApproval = config?.RequiresApproval ?? false;
        var status = (requiresApproval && !isAdmin)
            ? BookingStatus.Pending
            : BookingStatus.Confirmed;

        // Generate all dates for the series
        var dates = GenerateDates(dto.Start, dto.End,
            dto.RecurrencePattern, dto.RecurrenceEndDate);

        // Check ALL dates for conflicts before creating any
        var conflictingDates = new List<DateTime>();
        foreach (var (start, end) in dates)
        {
            var conflict = await _db.Bookings.AnyAsync(b =>
                b.RoomId == dto.RoomId &&
                b.Status != BookingStatus.Cancelled &&
                b.Status != BookingStatus.Rejected &&
                b.Start < end &&
                b.End > start);

            if (conflict) conflictingDates.Add(start);
        }

        if (conflictingDates.Any())
        {
            return Conflict(new {
                message = "Conflicts found on the following dates",
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
            Status = status,
            OccasionType = dto.OccasionType,
            RecurringGroupId = groupId,
            IsRecurringRoot = index == 0,
            RecurrencePattern = index == 0 ? dto.RecurrencePattern : null,
            RecurrenceEndDate = index == 0 ? dto.RecurrenceEndDate : null
        }).ToList();

        _db.Bookings.AddRange(bookings);
        await _db.SaveChangesAsync();

        // Send notification emails if pending
        if (status == BookingStatus.Pending)
        {
            var allAdmins = await _db.Users
                .Where(u => u.Role == UserRole.Admin || u.Role == UserRole.SuperAdmin)
                .ToListAsync();

            var user = await _userManager.FindByIdAsync(currentUserId!);
            foreach (var admin in allAdmins)
            {
                if (admin.Email != null)
                    await _emailService.SendPendingApprovalEmailAsync(
                        admin.Email,
                        user?.FullName ?? "Unknown",
                        room.Name,
                        dto.Start,
                        dto.OccasionType.ToString()
                    );
            }
        }

        return Ok(new {
            count = bookings.Count,
            status = status.ToString(),
            recurringGroupId = groupId
        });
    }

    // PUT /api/bookings/{id}/approve
    [HttpPut("{id}/approve")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Approve(int id)
    {
        var booking = await _db.Bookings
            .Include(b => b.User)
            .Include(b => b.Room)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (booking.Status != BookingStatus.Pending)
            return BadRequest("Booking is not pending");

        // If recurring, approve all in the group
        if (booking.RecurringGroupId.HasValue)
        {
            var group = await _db.Bookings
                .Where(b => b.RecurringGroupId == booking.RecurringGroupId &&
                           b.Status == BookingStatus.Pending)
                .ToListAsync();
            foreach (var b in group)
                b.Status = BookingStatus.Confirmed;
        }
        else
        {
            booking.Status = BookingStatus.Confirmed;
        }

        await _db.SaveChangesAsync();

        // Notify the user
        if (booking.User.Email != null)
            await _emailService.SendBookingApprovedEmailAsync(
                booking.User.Email,
                booking.User.FullName,
                booking.Room.Name,
                booking.Start
            );

        return Ok();
    }

    // PUT /api/bookings/{id}/reject
    [HttpPut("{id}/reject")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectBookingDto dto)
    {
        var booking = await _db.Bookings
            .Include(b => b.User)
            .Include(b => b.Room)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        if (booking.Status != BookingStatus.Pending)
            return BadRequest("Booking is not pending");

        // If recurring, reject all in the group
        if (booking.RecurringGroupId.HasValue)
        {
            var group = await _db.Bookings
                .Where(b => b.RecurringGroupId == booking.RecurringGroupId &&
                           b.Status == BookingStatus.Pending)
                .ToListAsync();
            foreach (var b in group)
                b.Status = BookingStatus.Rejected;
        }
        else
        {
            booking.Status = BookingStatus.Rejected;
        }

        await _db.SaveChangesAsync();

        // Notify the user
        if (booking.User.Email != null)
            await _emailService.SendBookingRejectedEmailAsync(
                booking.User.Email,
                booking.User.FullName,
                booking.Room.Name,
                booking.Start,
                dto.Reason
            );

        return Ok();
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
                           b.Status != BookingStatus.Cancelled)
                .ToListAsync();
            foreach (var b in group)
                b.Status = BookingStatus.Cancelled;
        }
        else
        {
            booking.Status = BookingStatus.Cancelled;
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
                RecurrencePattern.Weekly => current.AddDays(7),
                RecurrencePattern.BiWeekly => current.AddDays(14),
                RecurrencePattern.Monthly => current.AddMonths(1),
                _ => limit.AddDays(1) // exit
            };

            if (current > limit) break;
            dates.Add((current, current + duration));
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

public record RejectBookingDto(string? Reason);