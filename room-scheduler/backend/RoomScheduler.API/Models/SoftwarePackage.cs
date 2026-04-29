namespace RoomScheduler.API.Models;

public class SoftwarePackage
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;
}