using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Data;

public static class CoreDbSeeder
{
    public static async Task SeedCoreAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var db = services.GetRequiredService<AppDbContext>();

        const string superAdminEmail = "superadmin@roomscheduler.local";
        
        if (await userManager.FindByEmailAsync(superAdminEmail) == null)
        {
            var superAdmin = new ApplicationUser 
            {
                Id = "97c3bf8e-6b52-46b7-aa11-8468cf956766", 
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

        if (!await db.OccasionTypeConfigs.AnyAsync())
        {
            db.OccasionTypeConfigs.AddRange(
                new OccasionTypeConfig {
                    OccasionType = OccasionType.Kolokvijum,
                    Label = "Kolokvijum",
                    Color = "#2563eb"
                },
                new OccasionTypeConfig {
                    OccasionType = OccasionType.Ispit,
                    Label = "Ispit",
                    Color = "#dc2626"
                },
                new OccasionTypeConfig {
                    OccasionType = OccasionType.LabVezbe,
                    Label = "Lab vežbe",
                    Color = "#16a34a"
                }
            );
            await db.SaveChangesAsync();
        }
    }
}