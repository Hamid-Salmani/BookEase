using System.Net;
using BookEase.Application.Abstractions;
using BookEase.Application.Dtos;
using BookEase.Domain.Enums;
using BookEase.Infrastructure.Persistence;
using BookEase.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BookEase.Tests;

public class BookingFlowTests(BookEaseFactory factory) : IClassFixture<BookEaseFactory> {
  private async Task<(HttpClient Client, ServiceDto Service, StaffDto Staff)> SetupAsync(string serviceName = "Initial Consultation", string staffName = "Emma Collins") {
    var client = await factory.AsCustomerAsync();
    return (client, await client.GetServiceAsync(serviceName), await client.GetStaffAsync(staffName));
  }

  [Fact]
  public async Task New_paid_booking_is_pending_with_a_ten_minute_hold_until_payment_arrives() {
    var (client, service, staff) = await SetupAsync();
    var slot = await client.FindSlotAsync(service.Id, staff.Id);

    var created = await client.BookAsync(service, staff, slot);

    created.Booking.Status.Should().Be(BookingStatus.Pending);
    created.Booking.ExpiresAtUtc.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(10), TimeSpan.FromSeconds(30));
    created.Payment!.AmountCents.Should().Be(service.PriceCents);
    created.Payment.PaymentIntentId.Should().StartWith("pi_");
    var duplicate = await client.PostJsonAsync("/api/bookings", new CreateBookingRequest(service.Id, staff.Id, slot.StartUtc, null));
    duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);
  }

  [Fact]
  public async Task Successful_payment_webhook_confirms_the_booking_once_even_when_delivered_twice() {
    var (client, service, staff) = await SetupAsync();
    var slot = await client.FindSlotAsync(service.Id, staff.Id);
    var created = await client.BookAsync(service, staff, slot);
    var intent = created.Payment!.PaymentIntentId;

    (await factory.SendWebhookAsync(intent, eventId: "evt_dupe_1")).StatusCode.Should().Be(HttpStatusCode.OK);
    var emailsAfterFirst = await factory.WithScopeAsync(async sp => await sp.GetRequiredService<AppDbContext>().EmailMessages.CountAsync());
    (await factory.SendWebhookAsync(intent, eventId: "evt_dupe_1")).StatusCode.Should().Be(HttpStatusCode.OK);
    (await factory.SendWebhookAsync(intent, eventId: "evt_dupe_2")).StatusCode.Should().Be(HttpStatusCode.OK);
    var emailsAfterRetries = await factory.WithScopeAsync(async sp => await sp.GetRequiredService<AppDbContext>().EmailMessages.CountAsync());

    var booking = await (await client.GetAsync($"/api/bookings/{created.Booking.Id}")).ReadAsync<BookingDto>();
    booking.Status.Should().Be(BookingStatus.Confirmed);
    booking.PaymentStatus.Should().Be(PaymentStatus.Succeeded);
    emailsAfterFirst.Should().BeGreaterThan(0);
    emailsAfterRetries.Should().Be(emailsAfterFirst);
  }

  [Fact]
  public async Task Webhook_with_an_invalid_signature_is_rejected_and_changes_nothing() {
    var (client, service, staff) = await SetupAsync();
    var created = await client.BookAsync(service, staff, await client.FindSlotAsync(service.Id, staff.Id));

    var response = await factory.SendWebhookAsync(created.Payment!.PaymentIntentId, signature: "forged");

    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    var booking = await (await client.GetAsync($"/api/bookings/{created.Booking.Id}")).ReadAsync<BookingDto>();
    booking.Status.Should().Be(BookingStatus.Pending);
  }

  [Fact]
  public async Task Confirmation_and_admin_emails_are_queued_and_delivered_by_the_dispatcher() {
    var (client, service, staff) = await SetupAsync();
    await factory.BookAndPayAsync(client, service, staff, await client.FindSlotAsync(service.Id, staff.Id));

    var sent = await factory.WithScopeAsync(sp => sp.GetRequiredService<IEmailDispatcher>().DispatchPendingAsync(CancellationToken.None));

    sent.Should().BeGreaterThanOrEqualTo(2);
    factory.Emails.Sent.Should().Contain(e => e.To == "customer@demo.com" && e.Subject.StartsWith("Booking confirmed"));
    factory.Emails.Sent.Should().Contain(e => e.To == "hello@serenity-demo.com" && e.Subject.StartsWith("New booking"));
  }

  [Fact]
  public async Task Cancelling_inside_the_free_window_refunds_the_payment() {
    var (client, service, staff) = await SetupAsync();
    var created = await factory.BookAndPayAsync(client, service, staff, await client.FindSlotAsync(service.Id, staff.Id));

    var quote = await (await client.GetAsync($"/api/bookings/{created.Booking.Id}/cancellation-quote")).ReadAsync<CancellationQuoteDto>();
    quote.WithinFreeWindow.Should().BeTrue();
    quote.RefundCents.Should().Be(service.PriceCents);

    var response = await client.PostJsonAsync($"/api/bookings/{created.Booking.Id}/cancel", new CancelBookingRequest("Plans changed"));

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var booking = await response.ReadAsync<BookingDto>();
    booking.Status.Should().Be(BookingStatus.Cancelled);
    booking.PaymentStatus.Should().Be(PaymentStatus.Refunded);
    booking.RefundedCents.Should().Be(service.PriceCents);
  }

  [Fact]
  public async Task Cancelling_inside_the_cancellation_window_gives_no_refund() {
    var (client, service, staff) = await SetupAsync();
    var created = await factory.BookAndPayAsync(client, service, staff, await client.FindSlotAsync(service.Id, staff.Id));
    await MoveBookingAsync(created.Booking.Id, DateTime.UtcNow.AddHours(3), service);

    var response = await client.PostJsonAsync($"/api/bookings/{created.Booking.Id}/cancel", new CancelBookingRequest(null));

    var booking = await response.ReadAsync<BookingDto>();
    booking.Status.Should().Be(BookingStatus.Cancelled);
    booking.PaymentStatus.Should().Be(PaymentStatus.Succeeded);
    booking.RefundedCents.Should().Be(0);
  }

  [Fact]
  public async Task Rescheduling_moves_the_booking_and_is_blocked_inside_the_window() {
    var (client, service, staff) = await SetupAsync();
    var created = await factory.BookAndPayAsync(client, service, staff, await client.FindSlotAsync(service.Id, staff.Id));
    var newSlot = await client.FindSlotAsync(service.Id, staff.Id, skip: 4);

    var moved = await client.PostJsonAsync($"/api/bookings/{created.Booking.Id}/reschedule", new RescheduleRequest(newSlot.StartUtc, null));

    moved.StatusCode.Should().Be(HttpStatusCode.OK);
    (await moved.ReadAsync<BookingDto>()).StartUtc.Should().Be(newSlot.StartUtc);

    await MoveBookingAsync(created.Booking.Id, DateTime.UtcNow.AddHours(5), service);
    var late = await client.PostJsonAsync($"/api/bookings/{created.Booking.Id}/reschedule", new RescheduleRequest(newSlot.StartUtc, null));
    late.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
  }

  [Fact]
  public async Task Unpaid_pending_bookings_expire_and_release_the_slot() {
    var (client, service, staff) = await SetupAsync();
    var slot = await client.FindSlotAsync(service.Id, staff.Id);
    var created = await client.BookAsync(service, staff, slot);
    await factory.WithScopeAsync(async sp => {
      var db = sp.GetRequiredService<AppDbContext>();
      var booking = await db.Bookings.FirstAsync(b => b.Id == created.Booking.Id);
      booking.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
      return await db.SaveChangesAsync();
    });

    var expired = await factory.WithScopeAsync(sp => sp.GetRequiredService<IMaintenanceService>().ExpirePendingAsync(CancellationToken.None));

    expired.Should().BeGreaterThanOrEqualTo(1);
    var booking = await (await client.GetAsync($"/api/bookings/{created.Booking.Id}")).ReadAsync<BookingDto>();
    booking.Status.Should().Be(BookingStatus.Cancelled);
    var rebook = await client.PostJsonAsync("/api/bookings", new CreateBookingRequest(service.Id, staff.Id, slot.StartUtc, null));
    rebook.StatusCode.Should().Be(HttpStatusCode.Created);
  }

  [Fact]
  public async Task Payment_that_arrives_after_expiry_is_refunded_automatically() {
    var (client, service, staff) = await SetupAsync();
    var created = await client.BookAsync(service, staff, await client.FindSlotAsync(service.Id, staff.Id));
    await factory.WithScopeAsync(async sp => {
      var db = sp.GetRequiredService<AppDbContext>();
      (await db.Bookings.FirstAsync(b => b.Id == created.Booking.Id)).ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
      await db.SaveChangesAsync();
      return await sp.GetRequiredService<IMaintenanceService>().ExpirePendingAsync(CancellationToken.None);
    });

    (await factory.SendWebhookAsync(created.Payment!.PaymentIntentId)).StatusCode.Should().Be(HttpStatusCode.OK);

    var booking = await (await client.GetAsync($"/api/bookings/{created.Booking.Id}")).ReadAsync<BookingDto>();
    booking.Status.Should().Be(BookingStatus.Cancelled);
    booking.PaymentStatus.Should().Be(PaymentStatus.Refunded);
  }

  [Fact]
  public async Task Reminders_are_queued_once_for_bookings_starting_within_24_hours() {
    var (client, service, staff) = await SetupAsync();
    var created = await factory.BookAndPayAsync(client, service, staff, await client.FindSlotAsync(service.Id, staff.Id));
    await MoveBookingAsync(created.Booking.Id, DateTime.UtcNow.AddHours(6), service);

    var first = await factory.WithScopeAsync(sp => sp.GetRequiredService<IMaintenanceService>().QueueRemindersAsync(CancellationToken.None));
    var second = await factory.WithScopeAsync(sp => sp.GetRequiredService<IMaintenanceService>().QueueRemindersAsync(CancellationToken.None));

    first.Should().BeGreaterThanOrEqualTo(1);
    second.Should().Be(0);
    var reminders = await factory.WithScopeAsync(async sp => await sp.GetRequiredService<AppDbContext>().EmailMessages.CountAsync(m => m.Subject.StartsWith("Reminder")));
    reminders.Should().BeGreaterThanOrEqualTo(1);
  }

  [Fact]
  public async Task Other_customers_cannot_see_or_cancel_a_booking() {
    var (client, service, staff) = await SetupAsync();
    var created = await client.BookAsync(service, staff, await client.FindSlotAsync(service.Id, staff.Id));
    var other = factory.CreateClient();
    var register = await other.PostJsonAsync("/api/auth/register", new RegisterRequest("intruder@example.com", "Password1", "Intruder", null));
    other.DefaultRequestHeaders.Authorization = new("Bearer", (await register.ReadAsync<AuthResponse>()).AccessToken);

    (await other.GetAsync($"/api/bookings/{created.Booking.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    (await other.PostJsonAsync($"/api/bookings/{created.Booking.Id}/cancel", new CancelBookingRequest(null))).StatusCode.Should().Be(HttpStatusCode.NotFound);
  }

  [Fact]
  public async Task Booking_in_the_past_or_outside_working_hours_is_rejected() {
    var (client, service, staff) = await SetupAsync();

    var past = await client.PostJsonAsync("/api/bookings", new CreateBookingRequest(service.Id, staff.Id, DateTime.UtcNow.AddDays(-1), null));
    var night = await client.PostJsonAsync("/api/bookings", new CreateBookingRequest(service.Id, staff.Id, DateTime.UtcNow.Date.AddDays(3).AddHours(3), null));

    past.StatusCode.Should().Be(HttpStatusCode.Conflict);
    night.StatusCode.Should().Be(HttpStatusCode.Conflict);
    (await night.ReadAsync<ProblemDetails>()).Title.Should().Be("Slot unavailable");
  }

  private Task<int> MoveBookingAsync(Guid bookingId, DateTime startUtc, ServiceDto service) => factory.WithScopeAsync(async sp => {
    var db = sp.GetRequiredService<AppDbContext>();
    var booking = await db.Bookings.FirstAsync(b => b.Id == bookingId);
    booking.SetTimes(DateTime.SpecifyKind(startUtc, DateTimeKind.Utc), service.DurationMinutes, service.BufferMinutes);
    return await db.SaveChangesAsync();
  });
}
