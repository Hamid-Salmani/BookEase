using System.Globalization;
using System.Net;
using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;

namespace BookEase.Application.Services;

public record RenderedEmail(string Subject, string Html);

public static class EmailTemplates {
  public static RenderedEmail ForCustomer(BookingEmailEvent kind, Booking b, Business business, string frontendUrl) {
    var (subject, heading, intro) = kind switch {
      BookingEmailEvent.Confirmed => ($"Booking confirmed: {b.Service.Name}", "Your booking is confirmed", $"Hi {b.Customer.FullName}, you're all set. We look forward to seeing you."),
      BookingEmailEvent.Cancelled => ($"Booking cancelled: {b.Service.Name}", "Your booking was cancelled", $"Hi {b.Customer.FullName}, your booking has been cancelled."),
      BookingEmailEvent.Rescheduled => ($"Booking rescheduled: {b.Service.Name}", "Your booking was rescheduled", $"Hi {b.Customer.FullName}, your booking has moved to a new time."),
      _ => ($"Reminder: {b.Service.Name} is coming up", "Your appointment is coming up", $"Hi {b.Customer.FullName}, this is a friendly reminder about your upcoming appointment."),
    };
    var rows = BookingRows(b, business);
    if (kind == BookingEmailEvent.Cancelled && b.Payment is { RefundedCents: > 0 } payment) {
      rows.Add(("Refund", $"{Money(payment.RefundedCents, payment.Currency)} (3-10 business days to appear)"));
    }
    var footer = kind == BookingEmailEvent.Cancelled
      ? "We hope to see you another time."
      : $"Need to make a change? Free cancellation and rescheduling is available until {business.CancellationWindowHours} hours before the appointment.";
    return new RenderedEmail(subject, Layout(business.Name, heading, intro, rows, "View my bookings", frontendUrl.TrimEnd('/') + "/my-bookings", footer));
  }

  public static RenderedEmail ForAdmin(BookingEmailEvent kind, Booking b, Business business, string frontendUrl) {
    var action = kind switch {
      BookingEmailEvent.Confirmed => "New booking",
      BookingEmailEvent.Cancelled => "Booking cancelled",
      _ => "Booking rescheduled",
    };
    var rows = BookingRows(b, business);
    rows.Add(("Customer", $"{b.Customer.FullName} ({b.Customer.Email})"));
    if (string.IsNullOrWhiteSpace(b.Notes) == false) {
      rows.Add(("Notes", b.Notes));
    }
    var subject = $"{action}: {b.Customer.FullName} - {b.Service.Name}";
    return new RenderedEmail(subject, Layout(business.Name, action, $"{b.Customer.FullName} booked {b.Service.Name} with {b.Staff.Name}.", rows, "Open admin dashboard", frontendUrl.TrimEnd('/') + "/admin/bookings", "This is an automated notification."));
  }

  private static List<(string, string)> BookingRows(Booking b, Business business) {
    var zone = TimeHelper.Zone(business.TimeZoneId);
    var start = TimeHelper.ToLocal(b.StartUtc, zone);
    var when = start.ToString("dddd, MMMM d, yyyy 'at' h:mm tt", CultureInfo.InvariantCulture) + $" ({business.TimeZoneId})";
    return [
      ("Reference", b.Reference),
      ("Service", b.Service.Name),
      ("With", b.Staff.Name),
      ("When", when),
      ("Duration", $"{b.Service.DurationMinutes} minutes"),
      ("Price", b.PriceCents == 0 ? "Free" : Money(b.PriceCents, b.Currency)),
    ];
  }

  private static string Money(int cents, string currency) => $"{(cents / 100m).ToString("0.00", CultureInfo.InvariantCulture)} {currency.ToUpperInvariant()}";

  private static string Layout(string businessName, string heading, string intro, IEnumerable<(string Label, string Value)> rows, string ctaText, string ctaUrl, string footer) {
    static string e(string? value) => WebUtility.HtmlEncode(value) ?? string.Empty;
    var rowsHtml = string.Concat(rows.Select(r =>
      $"<tr><td style=\"padding:8px 0;color:#6b7280;font-size:14px;width:110px;vertical-align:top\">{e(r.Label)}</td><td style=\"padding:8px 0;color:#111827;font-size:14px;font-weight:500\">{e(r.Value)}</td></tr>"));
    return $"""
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(heading)}</title></head>
      <body style="margin:0;background:#f4f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
            <tr><td style="background:#0f766e;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:600">{e(businessName)}</td></tr>
            <tr><td style="padding:28px">
              <h1 style="margin:0 0 8px;font-size:22px;color:#111827">{e(heading)}</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151">{e(intro)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:24px">{rowsHtml}</table>
              <a href="{e(ctaUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">{e(ctaText)}</a>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280">{e(footer)}</p>
            </td></tr>
          </table>
        </td></tr></table>
      </body></html>
      """;
  }
}
