namespace RoomScheduler.API.Models;

public class Booking
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;
    public string UserId { get; set; } = "";
    public ApplicationUser User { get; set; } = null!;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string? Notes { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Confirmed;
    public OccasionType OccasionType { get; set; }

    // Recurring booking fields
    public Guid? RecurringGroupId { get; set; }
    public bool IsRecurringRoot { get; set; } = false;
    public RecurrencePattern? RecurrencePattern { get; set; }
    public DateTime? RecurrenceEndDate { get; set; }
}

public enum BookingStatus
{
    Confirmed,
    Pending,
    Cancelled,
    Rejected
}

public enum OccasionType
{
    Kolokvijum = 0,
    Ispit = 1,
    LabVezbe = 2
}

public enum RecurrencePattern
{
    Weekly = 0,
    BiWeekly = 1,
    Monthly = 2
}