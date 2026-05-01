using System.Net;
using System.Net.Mail;

namespace RoomScheduler.API.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    private async Task SendAsync(string to, string subject, string body)
    {
        var host = _config["Email:SmtpHost"]!;
        var port = int.Parse(_config["Email:SmtpPort"]!);
        var from = _config["Email:From"]!;

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = false,
            Credentials = CredentialCache.DefaultNetworkCredentials
        };

        var mail = new MailMessage {
            From = new MailAddress(from),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        mail.To.Add(to);

        await client.SendMailAsync(mail);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
    {
        await SendAsync(toEmail, "Reset your EasySpace password", $"""
            <h2>Reset your password</h2>
            <p>Click the link below to reset your password:</p>
            <a href="{resetLink}">{resetLink}</a>
            <p>This link expires in 1 hour.</p>
            <p>If you did not request a password reset, ignore this email.</p>
            """);
    }

    public async Task SendPendingApprovalEmailAsync(
        string toEmail, string professorName,
        string roomName, DateTime start, string occasionType)
    {
        await SendAsync(toEmail, "New booking pending approval", $"""
            <h2>New booking requires approval</h2>
            <p><strong>{professorName}</strong> has requested a booking:</p>
            <ul>
                <li>Room: {roomName}</li>
                <li>Type: {occasionType}</li>
                <li>Date: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            <p>Please log in to approve or reject this booking.</p>
            """);
    }

    public async Task SendBookingApprovedEmailAsync(
        string toEmail, string fullName,
        string roomName, DateTime start)
    {
        await SendAsync(toEmail, "Your booking has been approved", $"""
            <h2>Booking approved</h2>
            <p>Hi {fullName},</p>
            <p>Your booking has been approved:</p>
            <ul>
                <li>Room: {roomName}</li>
                <li>Date: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            """);
    }

    public async Task SendBookingRejectedEmailAsync(
        string toEmail, string fullName,
        string roomName, DateTime start, string? reason)
    {
        await SendAsync(toEmail, "Your booking has been rejected", $"""
            <h2>Booking rejected</h2>
            <p>Hi {fullName},</p>
            <p>Unfortunately your booking was rejected:</p>
            <ul>
                <li>Room: {roomName}</li>
                <li>Date: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            {(reason != null ? $"<p>Reason: {reason}</p>" : "")}
            """);
    }

    public async Task SendBookingCancelledEmailAsync(
        string toEmail, string fullName,
        string roomName, DateTime start)
    {
        await SendAsync(toEmail, "Your booking has been cancelled", $"""
            <h2>Booking cancelled</h2>
            <p>Hi {fullName},</p>
            <p>Your booking has been cancelled by an administrator:</p>
            <ul>
                <li>Room: {roomName}</li>
                <li>Date: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            """);
    }
}