using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var db = services.GetRequiredService<AppDbContext>();

        // Seed SuperAdmin
        const string superAdminEmail = "superadmin@roomscheduler.local";
        if (await userManager.FindByEmailAsync(superAdminEmail) == null)
        {
            var superAdmin = new ApplicationUser {
                UserName = superAdminEmail,
                Email = superAdminEmail,
                FirstName = "Super",
                LastName = "Admin",
                IsActive = true,
                EmailConfirmed = true,
                Role = UserRole.SuperAdmin
            };
            await userManager.CreateAsync(superAdmin, "SuperAdmin123!");
        }

        // Seed OccasionTypeConfigs
        if (!await db.OccasionTypeConfigs.AnyAsync())
        {
            db.OccasionTypeConfigs.AddRange(
                new OccasionTypeConfig {
                    OccasionType = OccasionType.Kolokvijum,
                    Label = "Kolokvijum",
                    Color = "#2563eb",
                    PendingColor = "#93c5fd",
                    RequiresApproval = false
                },
                new OccasionTypeConfig {
                    OccasionType = OccasionType.Ispit,
                    Label = "Ispit",
                    Color = "#dc2626",
                    PendingColor = "#fca5a5",
                    RequiresApproval = true
                },
                new OccasionTypeConfig {
                    OccasionType = OccasionType.LabVezbe,
                    Label = "Lab vežbe",
                    Color = "#16a34a",
                    PendingColor = "#86efac",
                    RequiresApproval = false
                }
            );
            await db.SaveChangesAsync();
        }
    }
}
