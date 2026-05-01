using Microsoft.AspNetCore.Identity;

namespace RoomScheduler.API.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // Computed by the database: TRIM(COALESCE(FirstName,'') || ' ' || COALESCE(LastName,''))
    // Never assign this directly — the DB always generates it from FirstName and LastName.
    public string FullName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public UserRole Role { get; set; } = UserRole.User;
    public int? IndexNumber { get; set; }
    public Department? Department { get; set; }
    public string? Title { get; set; }
}
