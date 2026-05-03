using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/profile — get own full profile
    [HttpGet]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = _userManager.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId!);
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

    // PUT /api/profile — update own profile (no role change)
    [HttpPut]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileDto dto)
    {
        var userId = _userManager.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

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

public record UpdateMyProfileDto(string FirstName, string LastName, string Email, int? IndexNumber, string? Department, string? Title);
