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

        builder.Entity<ApplicationUser>()
            .Property(u => u.Department)
            .HasConversion<string>();

        // FullName is always computed by the database from FirstName and LastName.
        // EF Core will never include it in INSERT/UPDATE statements.
        builder.Entity<ApplicationUser>()
            .Property(u => u.FullName)
            .HasComputedColumnSql(
                "TRIM(COALESCE(\"FirstName\",'') || ' ' || COALESCE(\"LastName\",''))",
                stored: true);

        // Indexes for searchable user fields
        builder.Entity<ApplicationUser>().HasIndex(u => u.FullName);
        builder.Entity<ApplicationUser>().HasIndex(u => u.IndexNumber);
        builder.Entity<ApplicationUser>().HasIndex(u => u.Department);

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
