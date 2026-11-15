using System.Text.RegularExpressions;
using BookEase.Application.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BookEase.Infrastructure.Email;

public class SmtpOptions {
  public const string Section = "Smtp";
  public string Host { get; set; } = "localhost";
  public int Port { get; set; } = 1025;
  public bool UseTls { get; set; }
  public string? Username { get; set; }
  public string? Password { get; set; }
  public string FromAddress { get; set; } = "no-reply@bookease.local";
  public string FromName { get; set; } = "BookEase";
}

public partial class MailKitEmailSender(IOptions<SmtpOptions> options) : IEmailSender {
  public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct) {
    var smtp = options.Value;
    var message = new MimeMessage();
    message.From.Add(new MailboxAddress(smtp.FromName, smtp.FromAddress));
    message.To.Add(MailboxAddress.Parse(to));
    message.Subject = subject;
    message.Body = new BodyBuilder { HtmlBody = htmlBody, TextBody = ToPlainText(htmlBody) }.ToMessageBody();
    using var client = new SmtpClient();
    await client.ConnectAsync(smtp.Host, smtp.Port, smtp.UseTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None, ct);
    if (string.IsNullOrEmpty(smtp.Username) == false) {
      await client.AuthenticateAsync(smtp.Username, smtp.Password ?? string.Empty, ct);
    }
    await client.SendAsync(message, ct);
    await client.DisconnectAsync(true, ct);
  }

  private static string ToPlainText(string html) =>
    Regex.Replace(Regex.Replace(html, "<(style|head)[^>]*>.*?</\\1>", string.Empty, RegexOptions.Singleline), "<[^>]+>", " ").Replace("&amp;", "&").Trim();
}
