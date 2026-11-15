using System.Net;
using BookEase.Application.Dtos;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using BookEase.Infrastructure.Persistence;
using BookEase.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BookEase.Tests;

public class BookingConcurrencyTests(BookEaseFactory factory) : IClassFixture<BookEaseFactory> {
  [Fact]
  public async Task Parallel_requests_for_the_same_slot_produce_exactly_one_booking() {
    const int parallel = 12;
    var client = await factory.AsCustomerAsync();
    var service = await client.GetServiceAsync("Initial Consultation");
    var staff = await client.GetStaffAsync("Emma Collins");
    var slot = await client.FindSlotAsync(service.Id, staff.Id);
    var request = new CreateBookingRequest(service.Id, staff.Id, slot.StartUtc, "race");

    var responses = await Task.WhenAll(Enumerable.Range(0, parallel).Select(_ => client.PostJsonAsync("/api/bookings", request)));

    responses.Count(r => r.StatusCode == HttpStatusCode.Created).Should().Be(1);
    responses.Count(r => r.StatusCode == HttpStatusCode.Conflict).Should().Be(parallel - 1);
    var conflict = await responses.First(r => r.StatusCode == HttpStatusCode.Conflict).ReadAsync<ProblemDetails>();
    conflict.Status.Should().Be(409);
    conflict.Title.Should().Be("Slot unavailable");

    var active = await factory.WithScopeAsync(async sp => await sp.GetRequiredService<AppDbContext>().Bookings
      .CountAsync(b => b.StaffId == staff.Id && b.StartUtc == slot.StartUtc && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)));
    active.Should().Be(1);
  }

  [Fact]
  public async Task Parallel_requests_from_different_customers_still_produce_one_winner() {
    var admin = await factory.AsAdminAsync();
    var service = await admin.GetServiceAsync("Haircut & Style");
    var staff = await admin.GetStaffAsync("Liam Carter");
    var slot = await admin.FindSlotAsync(service.Id, staff.Id);
    var customers = new List<HttpClient>();
    for (var i = 0; i < 6; i++) {
      var anonymous = factory.CreateClient();
      var register = await anonymous.PostJsonAsync("/api/auth/register", new RegisterRequest($"racer{i}@example.com", "Password1", $"Racer {i}", null));
      register.StatusCode.Should().Be(HttpStatusCode.Created);
      var auth = await register.ReadAsync<AuthResponse>();
      anonymous.DefaultRequestHeaders.Authorization = new("Bearer", auth.AccessToken);
      customers.Add(anonymous);
    }
    var request = new CreateBookingRequest(service.Id, staff.Id, slot.StartUtc, null);

    var responses = await Task.WhenAll(customers.Select(c => c.PostJsonAsync("/api/bookings", request)));

    responses.Count(r => r.StatusCode == HttpStatusCode.Created).Should().Be(1);
    responses.Count(r => r.StatusCode == HttpStatusCode.Conflict).Should().Be(5);
  }

  [Fact]
  public async Task Overlapping_but_not_identical_start_is_rejected() {
    var client = await factory.AsCustomerAsync();
    var service = await client.GetServiceAsync("Deep Tissue Massage");
    var staff = await client.GetStaffAsync("Sofia Martinez");
    var first = await client.FindSlotAsync(service.Id, staff.Id);
    await client.BookAsync(service, staff, first);

    var overlapping = new CreateBookingRequest(service.Id, staff.Id, first.StartUtc.AddMinutes(30), null);
    var response = await client.PostJsonAsync("/api/bookings", overlapping);

    response.StatusCode.Should().Be(HttpStatusCode.Conflict);
  }

  [Fact]
  public async Task Database_unique_index_rejects_a_second_active_booking_at_the_same_instant() {
    var client = await factory.AsCustomerAsync();
    var service = await client.GetServiceAsync("Skin Care Facial");
    var staff = await client.GetStaffAsync("Emma Collins");
    var slot = await client.FindSlotAsync(service.Id, staff.Id);
    var created = await client.BookAsync(service, staff, slot);

    var act = () => factory.WithScopeAsync(async sp => {
      var db = sp.GetRequiredService<AppDbContext>();
      var duplicate = new Booking { CustomerId = created.Booking.CustomerId, ServiceId = service.Id, StaffId = staff.Id, Status = BookingStatus.Confirmed, PriceCents = 1, Currency = "usd" };
      duplicate.SetTimes(slot.StartUtc, 60, 0);
      db.Bookings.Add(duplicate);
      return await db.SaveChangesAsync();
    });

    await act.Should().ThrowAsync<DbUpdateException>();
  }

  [Fact]
  public async Task Any_staff_booking_falls_through_to_the_next_free_staff_member() {
    var client = await factory.AsCustomerAsync();
    var service = await client.GetServiceAsync("Haircut & Style");
    var slot = await client.FindSlotAsync(service.Id, null);
    slot.StaffIds.Count.Should().BeGreaterThan(0);
    var request = new CreateBookingRequest(service.Id, null, slot.StartUtc, null);

    var first = await client.PostJsonAsync("/api/bookings", request);
    first.StatusCode.Should().Be(HttpStatusCode.Created);
    var booked = new HashSet<Guid> { (await first.ReadAsync<CreateBookingResponse>()).Booking.StaffId };
    for (var i = 1; i < slot.StaffIds.Count; i++) {
      var next = await client.PostJsonAsync("/api/bookings", request);
      next.StatusCode.Should().Be(HttpStatusCode.Created);
      booked.Add((await next.ReadAsync<CreateBookingResponse>()).Booking.StaffId);
    }
    booked.Should().HaveCount(slot.StaffIds.Count);
    (await client.PostJsonAsync("/api/bookings", request)).StatusCode.Should().Be(HttpStatusCode.Conflict);
  }
}
