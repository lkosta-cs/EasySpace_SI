namespace RoomScheduler.API.Models;

public class OccasionTypeConfig
{
    public int Id { get; set; }
    public OccasionType OccasionType { get; set; }
    public string Color { get; set; } = "#111827";
    public string PendingColor { get; set; } = "#6b7280";
    public bool RequiresApproval { get; set; } = false;
    public string Label { get; set; } = "";
}