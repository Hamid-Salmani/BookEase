using BookEase.Domain.Common;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using FluentAssertions;

namespace BookEase.Tests;

public class BookingStateTests {
  private static Booking NewBooking(DateTime start) {
    var booking = new Booking { Status = BookingStatus.Pending, ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10) };
    booking.SetTimes(start, 60, 15);
    return booking;
  }

  [Fact]
  public void Set_times_includes_buffer_in_blocked_window() {
    var start = new DateTime(2027, 1, 12, 15, 0, 0, DateTimeKind.Utc);
    var booking = NewBooking(start);
    booking.EndUtc.Should().Be(start.AddMinutes(60));
    booking.BlockedUntilUtc.Should().Be(start.AddMinutes(75));
  }

  [Fact]
  public void Confirm_clears_the_hold_and_only_works_from_pending() {
    var booking = NewBooking(DateTime.UtcNow.AddDays(3));
    booking.Confirm();
    booking.Status.Should().Be(BookingStatus.Confirmed);
    booking.ExpiresAtUtc.Should().BeNull();
    booking.Invoking(b => b.Confirm()).Should().Throw<DomainException>();
  }

  [Fact]
  public void Cancelled_bookings_cannot_be_cancelled_again() {
    var booking = NewBooking(DateTime.UtcNow.AddDays(3));
    booking.Cancel("x", DateTime.UtcNow);
    booking.Invoking(b => b.Cancel("y", DateTime.UtcNow)).Should().Throw<DomainException>();
  }

  [Fact]
  public void Complete_and_no_show_require_a_started_confirmed_booking() {
    var future = NewBooking(DateTime.UtcNow.AddDays(1));
    future.Confirm();
    future.Invoking(b => b.Complete(DateTime.UtcNow)).Should().Throw<DomainException>();
    var past = NewBooking(DateTime.UtcNow.AddDays(-1));
    past.Confirm();
    past.MarkNoShow(DateTime.UtcNow);
    past.Status.Should().Be(BookingStatus.NoShow);
  }

  [Fact]
  public void Pending_hold_only_blocks_the_slot_until_it_expires() {
    var booking = NewBooking(DateTime.UtcNow.AddDays(1));
    booking.HoldsSlot(DateTime.UtcNow).Should().BeTrue();
    booking.HoldsSlot(DateTime.UtcNow.AddMinutes(11)).Should().BeFalse();
  }
}
