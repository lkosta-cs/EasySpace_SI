namespace RoomScheduler.API.Services;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
    Task SendBookingCancelledEmailAsync(string toEmail, string fullName,
        string roomName, DateTime start);
}