namespace RoomScheduler.API.Models;

public class Room
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Seats { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<SoftwarePackage> SoftwarePackages { get; set; } = [];
    public ICollection<Booking> Bookings { get; set; } = [];
    public ICollection<RoomPermission> Permissions { get; set; } = [];
}