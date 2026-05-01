namespace RoomScheduler.API.Services;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
    Task SendPendingApprovalEmailAsync(string toEmail, string professorName,
        string roomName, DateTime start, string occasionType);
    Task SendBookingApprovedEmailAsync(string toEmail, string fullName,
        string roomName, DateTime start);
    Task SendBookingRejectedEmailAsync(string toEmail, string fullName,
        string roomName, DateTime start, string? reason);
    Task SendBookingCancelledEmailAsync(string toEmail, string fullName,
        string roomName, DateTime start);
}