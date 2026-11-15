using System.Net;
using System.Net.Http.Json;
using System.Text;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using BookEase.Domain.Enums;
using BookEase.Infrastructure.Persistence;
using BookEase.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BookEase.Tests;

public class AdminTests(BookEaseFactory factory) : IClassFixture<BookEaseFactory> {
  [Fact]
  public async Task Overview_and_reports_return_seeded_metrics() {
    var admin = await factory.AsAdminAsync();

    var overview = await (await admin.GetAsync("/api/admin/overview")).ReadAsync<OverviewDto>();
    var reports = await (await admin.GetAsync("/api/admin/reports")).ReadAsync<ReportsDto>();

    overview.UpcomingBookings.Should().BeGreaterThan(0);
    overview.Currency.Should().Be("usd");
    reports.Revenue.Should().HaveCount(30);
    reports.Revenue.Sum(r => r.RevenueCents).Should().BeGreaterThan(0);
    reports.TopServices.Should().NotBeEmpty();
    reports.BusiestHours.Should().NotBeEmpty();
  }

  [Fact]
  public async Task Booking_list_supports_filtering_sorting_and_paging() {
    var admin = await factory.AsAdminAsync();

    var page = await (await admin.GetAsync("/api/admin/bookings?status=Completed&sort=price&desc=true&pageSize=5")).ReadAsync<PagedResult<BookingDto>>();

    page.Items.Should().HaveCount(5);
    page.TotalCount.Should().BeGreaterThan(5);
    page.Items.Should().OnlyContain(b => b.Status == BookingStatus.Completed);
    page.Items.Select(b => b.PriceCents).Should().BeInDescendingOrder();
    var bad = await admin.GetAsync("/api/admin/bookings?pageSize=1000");
    bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
  }

  [Fact]
  public async Task Csv_export_returns_a_file_with_a_header_row() {
    var admin = await factory.AsAdminAsync();

    var response = await admin.GetAsync("/api/admin/bookings/export?status=Completed");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    response.Content.Headers.ContentType!.MediaType.Should().Be("text/csv");
    var text = Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync()).TrimStart('﻿');
    text.Split('\n')[0].Should().StartWith("Reference,Status,Service");
    text.Split('\n').Length.Should().BeGreaterThan(3);
  }

  [Fact]
  public async Task Service_crud_validates_input_and_archives_services_that_have_bookings() {
    var admin = await factory.AsAdminAsync();
    var invalid = await admin.PostJsonAsync("/api/admin/services", new UpsertServiceRequest("", "x", 2, -1, -5, true));
    invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);

    var created = await (await admin.PostJsonAsync("/api/admin/services", new UpsertServiceRequest("Temp Service", "Temporary", 30, 5, 1000, true))).ReadAsync<ServiceDto>();
    var updated = await (await admin.PutAsJsonAsync($"/api/admin/services/{created.Id}", new UpsertServiceRequest("Temp Service 2", "Changed", 45, 5, 1500, true), ApiHelpers.Json)).ReadAsync<ServiceDto>();
    updated.DurationMinutes.Should().Be(45);
    (await admin.DeleteAsync($"/api/admin/services/{created.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    (await admin.GetAsync("/api/services")).StatusCode.Should().Be(HttpStatusCode.OK);

    var seeded = await admin.GetServiceAsync("Haircut & Style");
    (await admin.DeleteAsync($"/api/admin/services/{seeded.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    var list = await (await admin.GetAsync("/api/admin/services?search=haircut")).ReadAsync<PagedResult<ServiceDto>>();
    list.Items.Single().IsActive.Should().BeFalse();
  }

  [Fact]
  public async Task Time_off_removes_availability_for_that_day() {
    var admin = await factory.AsAdminAsync();
    var service = await admin.GetServiceAsync("Wellness Coaching Session");
    var staff = await admin.GetStaffAsync("Emma Collins");
    var slot = await admin.FindSlotAsync(service.Id, staff.Id);
    var zone = TimeHelper.Zone("America/New_York");
    var date = TimeHelper.LocalDate(slot.StartUtc, zone);

    var create = await admin.PostJsonAsync("/api/admin/time-off", new UpsertTimeOffRequest(staff.Id, TimeHelper.StartOfDayUtc(date, zone), TimeHelper.StartOfDayUtc(date.AddDays(1), zone), "Conference"));
    create.StatusCode.Should().Be(HttpStatusCode.Created);

    var availability = await (await admin.GetAsync($"/api/availability?serviceId={service.Id}&date={date:yyyy-MM-dd}&staffId={staff.Id}")).ReadAsync<AvailabilityDto>();
    availability.Slots.Should().BeEmpty();
  }

  [Fact]
  public async Task Working_hours_can_be_replaced_and_overlaps_are_rejected() {
    var admin = await factory.AsAdminAsync();
    var staff = await admin.GetStaffAsync("Liam Carter");
    var overlapping = new ReplaceWorkingHoursRequest([
      new(DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(12, 0)),
      new(DayOfWeek.Monday, new TimeOnly(11, 0), new TimeOnly(15, 0)),
    ]);
    (await admin.PutAsJsonAsync($"/api/admin/staff/{staff.Id}/working-hours", overlapping, ApiHelpers.Json)).StatusCode.Should().Be(HttpStatusCode.BadRequest);

    var valid = new ReplaceWorkingHoursRequest([new(DayOfWeek.Monday, new TimeOnly(8, 0), new TimeOnly(12, 0))]);
    var response = await admin.PutAsJsonAsync($"/api/admin/staff/{staff.Id}/working-hours", valid, ApiHelpers.Json);
    (await response.ReadAsync<List<WorkingHoursDto>>()).Should().ContainSingle();
  }

  [Fact]
  public async Task Free_services_are_confirmed_immediately_without_a_payment() {
    var admin = await factory.AsAdminAsync();
    var free = await (await admin.PostJsonAsync("/api/admin/services", new UpsertServiceRequest("Free Intro Call", "No charge", 15, 0, 0, true))).ReadAsync<ServiceDto>();
    var emma = await admin.GetStaffAsync("Emma Collins");
    var update = await admin.PutAsJsonAsync($"/api/admin/staff/{emma.Id}", new UpsertStaffRequest(emma.Name, emma.Title, emma.Bio, true, emma.ServiceIds.Append(free.Id).ToList()), ApiHelpers.Json);
    update.StatusCode.Should().Be(HttpStatusCode.OK);

    var customer = await factory.AsCustomerAsync();
    var slot = await customer.FindSlotAsync(free.Id, emma.Id);
    var booked = await customer.BookAsync(free, emma, slot);

    booked.Booking.Status.Should().Be(BookingStatus.Confirmed);
    booked.Payment.Should().BeNull();
  }

  [Fact]
  public async Task Admin_can_confirm_cancel_complete_and_mark_no_show() {
    var admin = await factory.AsAdminAsync();
    var customer = await factory.AsCustomerAsync();
    var service = await customer.GetServiceAsync("Skin Care Facial");
    var staff = await customer.GetStaffAsync("Sofia Martinez");
    var pending = await customer.BookAsync(service, staff, await customer.FindSlotAsync(service.Id, staff.Id));

    var confirmed = await (await admin.PostAsync($"/api/admin/bookings/{pending.Booking.Id}/confirm", null)).ReadAsync<BookingDto>();
    confirmed.Status.Should().Be(BookingStatus.Confirmed);
    (await admin.PostAsync($"/api/admin/bookings/{pending.Booking.Id}/complete", null)).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);

    await factory.WithScopeAsync(async sp => {
      var db = sp.GetRequiredService<AppDbContext>();
      var booking = await db.Bookings.FirstAsync(b => b.Id == pending.Booking.Id);
      booking.SetTimes(DateTime.UtcNow.AddHours(-3), service.DurationMinutes, service.BufferMinutes);
      return await db.SaveChangesAsync();
    });
    var noShow = await (await admin.PostAsync($"/api/admin/bookings/{pending.Booking.Id}/no-show", null)).ReadAsync<BookingDto>();
    noShow.Status.Should().Be(BookingStatus.NoShow);

    var second = await customer.BookAsync(service, staff, await customer.FindSlotAsync(service.Id, staff.Id));
    var cancelled = await (await admin.PostJsonAsync($"/api/admin/bookings/{second.Booking.Id}/cancel", new AdminCancelRequest("Staff sick", false))).ReadAsync<BookingDto>();
    cancelled.Status.Should().Be(BookingStatus.Cancelled);
  }

  [Fact]
  public async Task Calendar_returns_the_requested_week_in_business_time() {
    var admin = await factory.AsAdminAsync();
    var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

    var calendar = await (await admin.GetAsync($"/api/admin/bookings/calendar?date={date:yyyy-MM-dd}&view=week")).ReadAsync<CalendarDto>();

    calendar.TimeZoneId.Should().Be("America/New_York");
    (calendar.ToUtc - calendar.FromUtc).Should().BeCloseTo(TimeSpan.FromDays(7), TimeSpan.FromHours(1));
    (await admin.GetAsync($"/api/admin/bookings/calendar?date={date:yyyy-MM-dd}&view=month")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
  }

  [Fact]
  public async Task Staff_users_only_see_their_own_bookings_and_cannot_manage_the_catalog() {
    var staff = await factory.LoginAsync("staff@demo.com", "Staff123!");

    var page = await (await staff.GetAsync("/api/admin/bookings?pageSize=50")).ReadAsync<PagedResult<BookingDto>>();

    page.Items.Should().NotBeEmpty();
    page.Items.Should().OnlyContain(b => b.StaffName == "Emma Collins");
    (await staff.GetAsync("/api/admin/services")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
  }

  [Fact]
  public async Task Errors_use_the_problem_details_format() {
    var admin = await factory.AsAdminAsync();

    var response = await admin.GetAsync($"/api/admin/bookings/{Guid.NewGuid()}/nope");
    response.StatusCode.Should().Be(HttpStatusCode.NotFound);

    var missing = await admin.PostAsync($"/api/admin/bookings/{Guid.NewGuid()}/confirm", null);
    missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
    missing.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
    (await missing.ReadAsync<ProblemDetails>()).Status.Should().Be(404);
  }
}
