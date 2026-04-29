using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RoomScheduler.API.Models;
using RoomScheduler.API.Services;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || !user.IsActive)
            return Unauthorized("Invalid credentials");

        var result = await _signInManager
            .CheckPasswordSignInAsync(user, dto.Password, false);

        if (!result.Succeeded)
            return Unauthorized("Invalid credentials");

        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.CreateToken(user, roles);

        return Ok(new {
            token,
            user = new {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                role = roles.FirstOrDefault()
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new ApplicationUser {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            IsActive = true,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        await _userManager.AddToRoleAsync(user, "User");
        return Ok("User registered successfully");
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null) return Ok(); // don't reveal if email exists

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        // In production send this via email - for now just return it
        return Ok(new { token, userId = user.Id });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(dto.UserId);
        if (user == null) return BadRequest("Invalid request");

        var result = await _userManager
            .ResetPasswordAsync(user, dto.Token, dto.NewPassword);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok("Password reset successfully");
    }
}

// DTOs - Data Transfer Objects (the shape of data coming in from requests)
public record LoginDto(string Email, string Password);
public record RegisterDto(string Email, string Password, string FullName);
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string UserId, string Token, string NewPassword);