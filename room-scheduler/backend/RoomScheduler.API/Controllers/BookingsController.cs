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
        private readonly ILogger<BookingsController> _logger;

        public BookingsController(
            AppDbContext db,
            IEmailService emailService,
            IStringLocalizer<SharedResource> localizer,
            ILogger<BookingsController> logger)
        {
            _db = db;
            _emailService = emailService;
            _localizer = localizer;
            _logger = logger;
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
            var conflictingDates = await FindConflictingDates(dto.RoomId, dates);
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
            var bookings = BuildBookings(dates, dto.RoomId, currentUserId!, dto.OccasionType,
                dto.Notes, dto.RecurrencePattern, dto.RecurrenceEndDate, groupId, assignRootMetadata: true);

            _db.Bookings.AddRange(bookings);
            await _db.SaveChangesAsync();

            return Ok(new {
                count = bookings.Count,
                recurringGroupId = groupId
            });
        }

        // GET /api/bookings/{id} — single booking detail, for the edit modal
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();
            if (booking.UserId != currentUserId && !isAdmin)
                return Forbid();

            // Recurrence metadata only lives on the series root — resolve it if this isn't the root
            var pattern = booking.RecurrencePattern;
            var recurrenceEndDate = booking.RecurrenceEndDate;

            if (booking.RecurringGroupId.HasValue && !booking.IsRecurringRoot)
            {
                var root = await _db.Bookings.FirstOrDefaultAsync(b =>
                    b.RecurringGroupId == booking.RecurringGroupId && b.IsRecurringRoot);
                if (root != null)
                {
                    pattern = root.RecurrencePattern;
                    recurrenceEndDate = root.RecurrenceEndDate;
                }
            }

            return Ok(new {
                id = booking.Id,
                roomId = booking.RoomId,
                start = booking.Start,
                end = booking.End,
                notes = booking.Notes,
                occasionType = booking.OccasionType,
                recurringGroupId = booking.RecurringGroupId,
                recurrencePattern = pattern,
                recurrenceEndDate = recurrenceEndDate
            });
        }

        // PUT /api/bookings/{id} — edit a booking, with the same conflict checks as Create
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBookingDto dto)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
            var isProfessor = User.IsInRole("Professor");
            var isAssistant = User.IsInRole("Assistant");

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();
            if (booking.UserId != currentUserId && !isAdmin)
                return Forbid();

            if (isAssistant && dto.OccasionType != OccasionType.LabVezbe)
                return Forbid();

            if (isProfessor && dto.OccasionType == OccasionType.LabVezbe)
                return Forbid();

            var room = await _db.Rooms.FindAsync(dto.RoomId);
            if (room == null || !room.IsActive)
                return BadRequest(_localizer["RoomNotFoundOrInactive"].Value);

            var ownerUserId = booking.UserId;

            // Not part of a recurring series — plain in-place update, unless a
            // recurrence pattern was added, in which case it now becomes a series
            if (!booking.RecurringGroupId.HasValue)
            {
                var seriesDates = GenerateDates(dto.Start, dto.End, dto.RecurrencePattern, dto.RecurrenceEndDate);

                var conflicts = await FindConflictingDates(dto.RoomId, seriesDates, excludeBookingId: booking.Id);
                if (conflicts.Count > 0)
                    return Conflict(new {
                        message = _localizer["ConflictsFoundMessage"].Value,
                        conflictingDates = conflicts.Select(d => d.ToString("yyyy-MM-dd HH:mm")).ToList()
                    });

                if (seriesDates.Count == 1)
                {
                    booking.RoomId = dto.RoomId;
                    booking.Start = dto.Start;
                    booking.End = dto.End;
                    booking.OccasionType = dto.OccasionType;
                    booking.Notes = dto.Notes;
                    await _db.SaveChangesAsync();

                    return Ok(new { count = 1, recurringGroupId = (Guid?)null });
                }

                // A recurrence pattern was added — replace the single row with the new series
                _db.Bookings.Remove(booking);
                var seriesGroupId = Guid.NewGuid();
                var seriesBookings = BuildBookings(seriesDates, dto.RoomId, ownerUserId, dto.OccasionType,
                    dto.Notes, dto.RecurrencePattern, dto.RecurrenceEndDate, seriesGroupId, assignRootMetadata: true);

                _db.Bookings.AddRange(seriesBookings);
                await _db.SaveChangesAsync();

                return Ok(new { count = seriesBookings.Count, recurringGroupId = seriesGroupId });
            }

            // Recurring, editing only this occurrence — detach it from the series
            if (dto.EditType == EditType.Single)
            {
                var conflicts = await FindConflictingDates(dto.RoomId,
                    new List<(DateTime start, DateTime end)> { (dto.Start, dto.End) },
                    excludeBookingId: booking.Id);

                if (conflicts.Count > 0)
                    return Conflict(new {
                        message = _localizer["ConflictsFoundMessage"].Value,
                        conflictingDates = conflicts.Select(d => d.ToString("yyyy-MM-dd HH:mm")).ToList()
                    });

                var groupId = booking.RecurringGroupId.Value;
                var wasRoot = booking.IsRecurringRoot;
                var originalPattern = booking.RecurrencePattern;
                var originalEndDate = booking.RecurrenceEndDate;

                booking.RoomId = dto.RoomId;
                booking.Start = dto.Start;
                booking.End = dto.End;
                booking.OccasionType = dto.OccasionType;
                booking.Notes = dto.Notes;
                booking.RecurringGroupId = null;
                booking.IsRecurringRoot = false;
                booking.RecurrencePattern = null;
                booking.RecurrenceEndDate = null;

                // If the detached booking was the series root, promote the next-earliest
                // remaining member so the rest of the series keeps its recurrence metadata
                if (wasRoot)
                {
                    var nextRoot = await _db.Bookings
                        .Where(b => b.RecurringGroupId == groupId && b.Id != booking.Id)
                        .OrderBy(b => b.Start)
                        .FirstOrDefaultAsync();

                    if (nextRoot != null)
                    {
                        nextRoot.IsRecurringRoot = true;
                        nextRoot.RecurrencePattern = originalPattern;
                        nextRoot.RecurrenceEndDate = originalEndDate;
                    }
                }

                await _db.SaveChangesAsync();
                return Ok(new { count = 1, recurringGroupId = (Guid?)null });
            }

            // Recurring, editing this and all following occurrences —
            // past occurrences stay untouched, future ones are replaced
            var oldGroupId = booking.RecurringGroupId.Value;
            var groupMembers = await _db.Bookings
                .Where(b => b.RecurringGroupId == oldGroupId)
                .ToListAsync();

            var futureOnes = groupMembers.Where(b => b.Start >= booking.Start).ToList();
            var pastCount = groupMembers.Count - futureOnes.Count;

            var newDates = GenerateDates(dto.Start, dto.End, dto.RecurrencePattern, dto.RecurrenceEndDate);

            var conflictingFutureDates = await FindConflictingDates(dto.RoomId, newDates, excludeGroupId: oldGroupId);
            if (conflictingFutureDates.Count > 0)
                return Conflict(new {
                    message = _localizer["ConflictsFoundMessage"].Value,
                    conflictingDates = conflictingFutureDates.Select(d => d.ToString("yyyy-MM-dd HH:mm")).ToList()
                });

            _db.Bookings.RemoveRange(futureOnes);

            Guid? newGroupId;
            bool assignRootMetadata;
            if (newDates.Count == 1 && pastCount == 0)
            {
                // The whole series collapses into a single standalone booking
                newGroupId = null;
                assignRootMetadata = false;
            }
            else
            {
                newGroupId = oldGroupId;
                // Only stamp new root metadata if no past root survives to hold it
                assignRootMetadata = pastCount == 0;
            }

            var newBookings = BuildBookings(newDates, dto.RoomId, ownerUserId, dto.OccasionType,
                dto.Notes, dto.RecurrencePattern, dto.RecurrenceEndDate, newGroupId, assignRootMetadata);

            _db.Bookings.AddRange(newBookings);
            await _db.SaveChangesAsync();

            return Ok(new { count = newBookings.Count, recurringGroupId = newGroupId });
        }

        // DELETE /api/bookings/{id}?editType=Single|FutureSeries
        [HttpDelete("{id}")]
        public async Task<IActionResult> Cancel(int id, [FromQuery] EditType editType = EditType.FutureSeries)
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

            // If recurring and the whole future series was requested, cancel every
            // non-cancelled occurrence from now on — otherwise just this one occurrence
            if (booking.RecurringGroupId.HasValue && editType == EditType.FutureSeries)
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

            // Notify owner if cancelled by admin — this is a best-effort side
            // effect, a broken/unreachable SMTP server should not fail the cancellation
            if (isAdmin && booking.UserId != currentUserId && booking.User.Email != null)
            {
                try
                {
                    await _emailService.SendBookingCancelledEmailAsync(
                        booking.User.Email,
                        booking.User.FullName,
                        booking.Room.Name,
                        booking.Start
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send booking cancellation email to {Email}", booking.User.Email);
                }
            }

            return NoContent();
        }

        // PUT /api/bookings/{id}/restore?editType=Single|FutureSeries — un-cancel a cancelled booking
        [HttpPut("{id}/restore")]
        public async Task<IActionResult> Restore(int id, [FromQuery] EditType editType = EditType.Single)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound();
            if (booking.UserId != currentUserId && !isAdmin)
                return Forbid();
            if (!booking.IsCancelled)
                return BadRequest(_localizer["BookingNotCancelled"].Value);

            // Single occurrence (default) — just this one. Future series — this and every
            // later occurrence in the group that's still cancelled.
            var targets = (booking.RecurringGroupId.HasValue && editType == EditType.FutureSeries)
                ? await _db.Bookings
                    .Where(b => b.RecurringGroupId == booking.RecurringGroupId &&
                            b.Start >= booking.Start &&
                            b.IsCancelled)
                    .ToListAsync()
                : new List<Booking> { booking };

            var conflictingDates = new List<DateTime>();
            foreach (var target in targets)
            {
                var conflict = await _db.Bookings.AnyAsync(b =>
                    b.Id != target.Id &&
                    b.RoomId == target.RoomId &&
                    !b.IsCancelled &&
                    b.Start < target.End &&
                    b.End > target.Start);

                if (conflict) conflictingDates.Add(target.Start);
            }

            if (conflictingDates.Count > 0)
                return Conflict(new {
                    message = _localizer["ConflictsFoundMessage"].Value,
                    conflictingDates = conflictingDates.Select(d => d.ToString("yyyy-MM-dd HH:mm")).ToList()
                });

            foreach (var target in targets)
                target.IsCancelled = false;
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

        // Helper — check a list of (start, end) slots against existing, non-cancelled bookings
        // in the same room. Exclusions let callers avoid conflicting with the booking(s) being replaced.
        private async Task<List<DateTime>> FindConflictingDates(
            int roomId,
            List<(DateTime start, DateTime end)> dates,
            int? excludeBookingId = null,
            Guid? excludeGroupId = null)
        {
            var conflictingDates = new List<DateTime>();
            foreach (var (start, end) in dates)
            {
                var conflict = await _db.Bookings.AnyAsync(b =>
                    b.RoomId == roomId &&
                    !b.IsCancelled &&
                    b.Start < end &&
                    b.End > start &&
                    (excludeBookingId == null || b.Id != excludeBookingId) &&
                    (excludeGroupId == null || b.RecurringGroupId != excludeGroupId));

                if (conflict) conflictingDates.Add(start);
            }
            return conflictingDates;
        }

        // Helper — build Booking entities for a generated date series, optionally
        // stamping recurrence metadata (pattern/end date/root flag) on the first one
        private static List<Booking> BuildBookings(
            List<(DateTime start, DateTime end)> dates,
            int roomId,
            string userId,
            OccasionType occasionType,
            string? notes,
            RecurrencePattern? pattern,
            DateTime? recurrenceEndDate,
            Guid? groupId,
            bool assignRootMetadata)
        {
            return dates.Select((datePair, index) => new Booking {
                RoomId = roomId,
                UserId = userId,
                Start = datePair.start,
                End = datePair.end,
                Notes = notes,
                OccasionType = occasionType,
                RecurringGroupId = groupId,
                IsRecurringRoot = assignRootMetadata && index == 0,
                RecurrencePattern = (assignRootMetadata && index == 0) ? pattern : null,
                RecurrenceEndDate = (assignRootMetadata && index == 0) ? recurrenceEndDate : null
            }).ToList();
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

    public record UpdateBookingDto(
        int RoomId,
        DateTime Start,
        DateTime End,
        OccasionType OccasionType,
        string? Notes,
        RecurrencePattern? RecurrencePattern,
        DateTime? RecurrenceEndDate,
        EditType EditType);