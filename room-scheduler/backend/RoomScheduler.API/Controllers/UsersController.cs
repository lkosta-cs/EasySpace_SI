using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using RoomScheduler.API.Data;
using RoomScheduler.API.Models;
using RoomScheduler.API.Resources;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IStringLocalizer<SharedResource> _localizer;

    public UsersController(
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        IStringLocalizer<SharedResource> localizer)
    {
        _userManager = userManager;
        _db = db;
        _localizer = localizer;
    }

    // GET /api/users — list all users
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userManager.Users
            .Select(u => new {
                id = u.Id,
                email = u.Email,
                fullName = u.FullName,
                isActive = u.IsActive,
                role = u.Role.ToString()
            })
            .ToListAsync();

        return Ok(users);
    }

    // PUT /api/users/5/toggle-active — enable or disable a user
    [HttpPut("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        user.IsActive = !user.IsActive;
        await _userManager.UpdateAsync(user);
        return Ok(new { user.IsActive });
    }

    // PUT /api/users/5/role — change a user's role
    [HttpPut("{id}/role")]
    public async Task<IActionResult> SetRole(string id, [FromBody] SetRoleDto dto)
    {
        var callerIsSuperAdmin = User.IsInRole("SuperAdmin");

        // Nobody can assign SuperAdmin via this endpoint
        if (dto.Role == "SuperAdmin")
            return Forbid();

        // Only SuperAdmin can assign Admin role
        if (dto.Role == "Admin" && !callerIsSuperAdmin)
            return Forbid();

        if (!Enum.TryParse<UserRole>(dto.Role, out var newRole))
            return BadRequest(_localizer["InvalidRole"].Value);

        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Prevent changing SuperAdmin's role
        if (user.Role == UserRole.SuperAdmin)
            return Forbid();

        user.Role = newRole;
        await _userManager.UpdateAsync(user);

        return Ok(new { role = dto.Role });
    }

    // GET /api/users/5/permissions — get room permissions for a user
    [HttpGet("{id}/permissions")]
    public async Task<IActionResult> GetPermissions(string id)
    {
        var permissions = await _db.RoomPermissions
            .Include(p => p.Room)
            .Where(p => p.UserId == id)
            .Select(p => new {
                roomId = p.RoomId,
                roomName = p.Room.Name,
                level = p.Level.ToString()
            })
            .ToListAsync();

        return Ok(permissions);
    }

    // POST /api/users/5/permissions — assign room permission to a user
    [HttpPost("{id}/permissions")]
    public async Task<IActionResult> SetPermission(
        string id, [FromBody] SetPermissionDto dto)
    {
        var existing = await _db.RoomPermissions
            .FirstOrDefaultAsync(p =>
                p.UserId == id && p.RoomId == dto.RoomId);

        if (existing != null)
        {
            existing.Level = dto.Level;
        }
        else
        {
            _db.RoomPermissions.Add(new RoomPermission {
                UserId = id,
                RoomId = dto.RoomId,
                Level = dto.Level
            });
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    // DELETE /api/users/5/permissions/3 — remove a room permission
    [HttpDelete("{id}/permissions/{roomId}")]
    public async Task<IActionResult> RemovePermission(string id, int roomId)
    {
        var permission = await _db.RoomPermissions
            .FirstOrDefaultAsync(p =>
                p.UserId == id && p.RoomId == roomId);

        if (permission == null) return NotFound();

        _db.RoomPermissions.Remove(permission);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/users/{id} — get full profile for edit modal
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        return Ok(new {
            id = user.Id,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            fullName = user.FullName,
            isActive = user.IsActive,
            role = user.Role.ToString(),
            indexNumber = user.IndexNumber,
            department = user.Department?.ToString(),
            title = user.Title
        });
    }

    // PUT /api/users/{id}/profile — update all profile fields
    [HttpPut("{id}/profile")]
    public async Task<IActionResult> UpdateProfile(string id, [FromBody] UpdateProfileDto dto)
    {
        var callerIsSuperAdmin = User.IsInRole("SuperAdmin");

        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        if (user.Role == UserRole.SuperAdmin)
            return Forbid();

        if (dto.Role == "SuperAdmin")
            return Forbid();

        if (dto.Role == "Admin" && !callerIsSuperAdmin)
            return Forbid();

        if (!Enum.TryParse<UserRole>(dto.Role, out var newRole))
            return BadRequest(_localizer["InvalidRole"].Value);

        Department? department = null;
        if (!string.IsNullOrEmpty(dto.Department))
        {
            if (!Enum.TryParse<Department>(dto.Department, out var parsed))
                return BadRequest("Invalid department.");
            department = parsed;
        }

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.IndexNumber = dto.IndexNumber;
        user.Department = department;
        user.Title = dto.Title;
        user.Role = newRole;
        user.Email = dto.Email;
        user.UserName = dto.Email;
        user.NormalizedEmail = dto.Email.ToUpperInvariant();
        user.NormalizedUserName = dto.Email.ToUpperInvariant();

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok();
    }
}

public record SetRoleDto(string Role);
public record SetPermissionDto(int RoomId, PermissionLevel Level);
public record UpdateProfileDto(string FirstName, string LastName, string Email, string Role, int? IndexNumber, string? Department, string? Title);