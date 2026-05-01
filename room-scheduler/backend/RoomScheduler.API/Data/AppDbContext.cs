using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Data;

public class AppDbContext : IdentityUserContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<SoftwarePackage> SoftwarePackages => Set<SoftwarePackage>();
    public DbSet<RoomPermission> RoomPermissions => Set<RoomPermission>();
    public DbSet<OccasionTypeConfig> OccasionTypeConfigs => Set<OccasionTypeConfig>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>()
            .Property(u => u.Role)
            .HasConversion<string>();

        builder.Entity<Booking>()
            .HasIndex(b => new { b.RoomId, b.Start, b.End });

        builder.Entity<Booking>()
            .HasIndex(b => b.RecurringGroupId);

        builder.Entity<RoomPermission>()
            .HasIndex(p => new { p.UserId, p.RoomId })
            .IsUnique();

        builder.Entity<OccasionTypeConfig>()
            .HasIndex(o => o.OccasionType)
            .IsUnique();
    }
}