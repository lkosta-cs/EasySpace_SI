using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Data;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public UsersController(
        UserManager<ApplicationUser> userManager,
        AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    // GET /api/users — list all users
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userManager.Users.ToListAsync();
        var result = new List<object>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                isActive = user.IsActive,
                role = roles.FirstOrDefault() ?? "User"
            });
        }

        return Ok(result);
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
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        await _userManager.AddToRoleAsync(user, dto.Role);

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
}

public record SetRoleDto(string Role);
public record SetPermissionDto(int RoomId, PermissionLevel Level);