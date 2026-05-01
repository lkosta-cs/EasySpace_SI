using Microsoft.AspNetCore.Identity;

namespace RoomScheduler.API.Models;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public UserRole Role { get; set; } = UserRole.User;
}