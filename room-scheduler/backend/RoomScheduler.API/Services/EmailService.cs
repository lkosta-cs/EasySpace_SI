using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Localization;
using RoomScheduler.API.Resources;

namespace RoomScheduler.API.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly IStringLocalizer<SharedResource> _localizer;

    public EmailService(IConfiguration config, IStringLocalizer<SharedResource> localizer)
    {
        _config = config;
        _localizer = localizer;
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
        await SendAsync(toEmail, _localizer["EmailPasswordResetSubject"], $"""
            <h2>{_localizer["EmailPasswordResetH2"]}</h2>
            <p>{_localizer["EmailPasswordResetP"]}</p>
            <a href="{resetLink}">{resetLink}</a>
            <p>{_localizer["EmailPasswordResetExpiry"]}</p>
            <p>{_localizer["EmailPasswordResetIgnore"]}</p>
            """);
    }

    public async Task SendPendingApprovalEmailAsync(
        string toEmail, string professorName,
        string roomName, DateTime start, string occasionType)
    {
        await SendAsync(toEmail, _localizer["EmailPendingSubject"], $"""
            <h2>{_localizer["EmailPendingH2"]}</h2>
            <p><strong>{professorName}</strong> {_localizer["EmailPendingHasRequested"]}</p>
            <ul>
                <li>{_localizer["EmailPendingRoom"]}: {roomName}</li>
                <li>{_localizer["EmailPendingType"]}: {occasionType}</li>
                <li>{_localizer["EmailPendingDate"]}: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            <p>{_localizer["EmailPendingAction"]}</p>
            """);
    }

    public async Task SendBookingApprovedEmailAsync(
        string toEmail, string fullName,
        string roomName, DateTime start)
    {
        await SendAsync(toEmail, _localizer["EmailApprovedSubject"], $"""
            <h2>{_localizer["EmailApprovedH2"]}</h2>
            <p>{_localizer["EmailGreeting"]} {fullName},</p>
            <p>{_localizer["EmailApprovedBody"]}</p>
            <ul>
                <li>{_localizer["EmailRoom"]}: {roomName}</li>
                <li>{_localizer["EmailDate"]}: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            """);
    }

    public async Task SendBookingRejectedEmailAsync(
        string toEmail, string fullName,
        string roomName, DateTime start, string? reason)
    {
        await SendAsync(toEmail, _localizer["EmailRejectedSubject"], $"""
            <h2>{_localizer["EmailRejectedH2"]}</h2>
            <p>{_localizer["EmailGreeting"]} {fullName},</p>
            <p>{_localizer["EmailRejectedBody"]}</p>
            <ul>
                <li>{_localizer["EmailRoom"]}: {roomName}</li>
                <li>{_localizer["EmailDate"]}: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            {(reason != null ? $"<p>{_localizer["EmailRejectedReason"]}: {reason}</p>" : "")}
            """);
    }

    public async Task SendBookingCancelledEmailAsync(
        string toEmail, string fullName,
        string roomName, DateTime start)
    {
        await SendAsync(toEmail, _localizer["EmailCancelledSubject"], $"""
            <h2>{_localizer["EmailCancelledH2"]}</h2>
            <p>{_localizer["EmailGreeting"]} {fullName},</p>
            <p>{_localizer["EmailCancelledBody"]}</p>
            <ul>
                <li>{_localizer["EmailRoom"]}: {roomName}</li>
                <li>{_localizer["EmailDate"]}: {start:dddd, MMMM d yyyy} at {start:HH:mm}</li>
            </ul>
            """);
    }
}
