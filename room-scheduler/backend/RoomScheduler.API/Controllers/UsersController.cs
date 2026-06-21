using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using RoomScheduler.API.Models;
using RoomScheduler.API.Resources;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IStringLocalizer<SharedResource> _localizer;

    public UsersController(
        UserManager<ApplicationUser> userManager,
        IStringLocalizer<SharedResource> localizer)
    {
        _userManager = userManager;
        _localizer = localizer;
    }

    // GET /api/users — list users with search, role/status filters, sorting and paging
    [HttpGet]
    public async Task<IActionResult> GetAll(
        string? search,
        string? roles,
        string? status,
        string? sortBy = "name",
        string? sortDir = "asc",
        int page = 1,
        int pageSize = 20)
    {
        var currentUserId = _userManager.GetUserId(User);

        var query = _userManager.Users.Where(u => u.Id != currentUserId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.FirstName, pattern) ||
                EF.Functions.ILike(u.LastName, pattern) ||
                EF.Functions.ILike(u.Email!, pattern));
        }

        if (!string.IsNullOrWhiteSpace(roles))
        {
            var parsedRoles = roles
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Select(r => Enum.TryParse<UserRole>(r, out var parsed) ? (UserRole?)parsed : null)
                .Where(r => r.HasValue)
                .Select(r => r!.Value)
                .ToList();

            if (parsedRoles.Count > 0)
                query = query.Where(u => parsedRoles.Contains(u.Role));
        }

        if (status == "active")
            query = query.Where(u => u.IsActive);
        else if (status == "inactive")
            query = query.Where(u => !u.IsActive);

        var totalCount = await query.CountAsync();

        var descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy switch
        {
            "surname" => descending ? query.OrderByDescending(u => u.LastName) : query.OrderBy(u => u.LastName),
            "email" => descending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "role" => descending ? query.OrderByDescending(u => u.Role) : query.OrderBy(u => u.Role),
            "status" => descending ? query.OrderByDescending(u => u.IsActive) : query.OrderBy(u => u.IsActive),
            _ => descending ? query.OrderByDescending(u => u.FirstName) : query.OrderBy(u => u.FirstName),
        };

        // pageSize <= 0 (e.g. -1) means "All" — skip paging entirely
        if (pageSize > 0)
            query = query.Skip((Math.Max(page, 1) - 1) * pageSize).Take(pageSize);

        var users = await query
            .Select(u => new {
                id = u.Id,
                email = u.Email,
                fullName = u.FullName,
                isActive = u.IsActive,
                role = u.Role.ToString()
            })
            .ToListAsync();

        return Ok(new { items = users, totalCount, page, pageSize });
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
public record UpdateProfileDto(string FirstName, string LastName, string Email, string Role, int? IndexNumber, string? Department, string? Title);