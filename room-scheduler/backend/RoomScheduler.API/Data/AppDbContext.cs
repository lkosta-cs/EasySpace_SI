using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Models;

namespace RoomScheduler.API.Data;

//Izvodimo nasu AppDbContext klasu iz IdentityDbContext klase jer ona  automatski 
//kreira sve korisnike, njihove dozvole i login tabele u mojoj bazi podataka
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<SoftwarePackage> SoftwarePackages => Set<SoftwarePackage>();
    public DbSet<RoomPermission> RoomPermissions => Set<RoomPermission>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Booking>()
            .HasIndex(b => new { b.RoomId, b.Start, b.End });

        builder.Entity<RoomPermission>()
            .HasIndex(p => new { p.UserId, p.RoomId })
            .IsUnique();
    }
}