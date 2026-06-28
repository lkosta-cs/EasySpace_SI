using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Controllers;

// Separate from UsersController (AdminOnly) — this exposes only id + name of bookable
// staff so any authenticated user can populate booking-organiser filters (e.g. on the calendar).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserDirectoryController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserDirectoryController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/userdirectory/bookable — id + full name of active Professors and Assistants
    [HttpGet("bookable")]
    public async Task<IActionResult> GetBookable()
    {
        var users = await _userManager.Users
            .Where(u => u.IsActive && (u.Role == UserRole.Professor || u.Role == UserRole.Assistant))
            .OrderBy(u => u.FirstName)
            .Select(u => new { id = u.Id, fullName = u.FullName })
            .ToListAsync();

        return Ok(users);
    }
}
