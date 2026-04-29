namespace RoomScheduler.API.Models;

public class RoomPermission
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public ApplicationUser User { get; set; } = null!;
    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;
    public PermissionLevel Level { get; set; }
}

public enum PermissionLevel { ViewOnly, CanBook }