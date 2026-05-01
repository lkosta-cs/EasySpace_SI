using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;
using RoomScheduler.API.Models;
using RoomScheduler.API.Resources;
using RoomScheduler.API.Services;

namespace RoomScheduler.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService,
        IEmailService emailService,
        IStringLocalizer<SharedResource> localizer)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _emailService = emailService;
        _localizer = localizer;
    }

    

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || !user.IsActive)
            return Unauthorized(_localizer["InvalidCredentials"].Value);

        var result = await _signInManager
            .CheckPasswordSignInAsync(user, dto.Password, false);

        if (!result.Succeeded)
            return Unauthorized(_localizer["InvalidCredentials"].Value);

        var token = _tokenService.CreateToken(user);

        return Ok(new {
            token,
            user = new {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                role = user.Role.ToString()
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var nameParts = dto.FullName.Split(' ', 2);
        var user = new ApplicationUser {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = nameParts[0],
            LastName = nameParts.Length > 1 ? nameParts[1] : string.Empty,
            IsActive = true,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(_localizer["UserRegisteredSuccessfully"].Value);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null) return Ok();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = Uri.EscapeDataString(token);
        var resetLink = $"http://localhost:5173/reset-password?userId={user.Id}&token={encodedToken}";

        await _emailService.SendPasswordResetEmailAsync(user.Email!, resetLink);

        return Ok();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(dto.UserId);
        if (user == null) return BadRequest(_localizer["InvalidRequest"].Value);

        var result = await _userManager
            .ResetPasswordAsync(user, dto.Token, dto.NewPassword);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(_localizer["PasswordResetSuccessfully"].Value);
    }
}

// DTOs - Data Transfer Objects (the shape of data coming in from requests)
public record LoginDto(string Email, string Password);
public record RegisterDto(string Email, string Password, string FullName);
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string UserId, string Token, string NewPassword);