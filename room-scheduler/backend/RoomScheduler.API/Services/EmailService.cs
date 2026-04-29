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

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
    {
        var host = _config["Email:SmtpHost"]!;
        var port = int.Parse(_config["Email:SmtpPort"]!);
        var from = _config["Email:From"]!;

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = false,
            Credentials = CredentialCache.DefaultNetworkCredentials
        };

        var mail = new MailMessage
        {
            From = new MailAddress(from),
            Subject = "Reset your EasySpace password",
            Body = $"""
                <h2>Reset your password</h2>
                <p>Click the link below to reset your password:</p>
                <a href="{resetLink}">{resetLink}</a>
                <p>This link expires in 1 hour.</p>
                <p>If you did not request a password reset, ignore this email.</p>
                """,
            IsBodyHtml = true,
        };
        mail.To.Add(toEmail);

        await client.SendMailAsync(mail);
    }
}