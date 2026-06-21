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
        // Primer dodavanja običnog studenta/korisnika
        if (!await userManager.Users.AnyAsync(u => u.Email == "student@roomscheduler.local"))
        {
            var student = new ApplicationUser
            {
                UserName = "student@roomscheduler.local",
                Email = "student@roomscheduler.local",
                FirstName = "Luka",
                LastName = "Kostadinovic",
                Role = UserRole.User, // Tvoja enum uloga za običnog studenta
                EmailConfirmed = true
            };
            await userManager.CreateAsync(student, "Student123!");
        }

        // Primer dodavanja profesora
        if (!await userManager.Users.AnyAsync(u => u.Email == "profesor@roomscheduler.local"))
        {
            var profesor = new ApplicationUser
            {
                UserName = "profesor@roomscheduler.local",
                Email = "profesor@roomscheduler.local",
                FirstName = "Petar",
                LastName = "Petrović",
                Role = UserRole.Professor,
                EmailConfirmed = true
            };
            await userManager.CreateAsync(profesor, "Profesor123!");
        }



        // Seed OccasionTypeConfigs
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
