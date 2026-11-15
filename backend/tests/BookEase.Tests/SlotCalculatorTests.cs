using BookEase.Application.Availability;
using BookEase.Application.Common;
using FluentAssertions;

namespace BookEase.Tests;

public class SlotCalculatorTests {
  private static readonly DateTime Day = new(2027, 1, 12, 0, 0, 0, DateTimeKind.Utc);

  private static Interval At(int startHour, int startMinute, int endHour, int endMinute) =>
    new(Day.AddHours(startHour).AddMinutes(startMinute), Day.AddHours(endHour).AddMinutes(endMinute));

  [Fact]
  public void Generates_slots_across_the_working_window_respecting_duration() {
    var slots = SlotCalculator.Calculate([At(9, 0, 11, 0)], [], 60, 0, 30, Day);
    slots.Select(s => s.Start.TimeOfDay).Should().Equal(TimeSpan.FromHours(9), TimeSpan.FromHours(9.5), TimeSpan.FromHours(10));
    slots.Should().OnlyContain(s => s.End - s.Start == TimeSpan.FromMinutes(60));
  }

  [Fact]
  public void Booking_blocks_overlapping_slots_including_its_buffer() {
    var booking = At(10, 0, 11, 15);
    var slots = SlotCalculator.Calculate([At(9, 0, 13, 0)], [booking], 60, 15, 30, Day);
    slots.Select(s => s.Start.TimeOfDay).Should().Equal(
      TimeSpan.FromHours(11.5), TimeSpan.FromHours(12));
  }

  [Fact]
  public void New_slot_buffer_must_not_run_into_the_next_booking() {
    var next = At(11, 0, 12, 0);
    var slots = SlotCalculator.Calculate([At(9, 0, 12, 0)], [next], 60, 15, 30, Day);
    slots.Select(s => s.Start.TimeOfDay).Should().Equal(TimeSpan.FromHours(9), TimeSpan.FromHours(9.5));
  }

  [Fact]
  public void Time_off_removes_slots() {
    var slots = SlotCalculator.Calculate([At(9, 0, 12, 0)], [At(10, 0, 11, 0)], 30, 0, 30, Day);
    slots.Select(s => s.Start.TimeOfDay).Should().Equal(
      TimeSpan.FromHours(9), TimeSpan.FromHours(9.5), TimeSpan.FromHours(11), TimeSpan.FromHours(11.5));
  }

  [Fact]
  public void Earliest_start_cuts_off_past_and_too_soon_slots() {
    var slots = SlotCalculator.Calculate([At(9, 0, 12, 0)], [], 60, 0, 30, Day.AddHours(10));
    slots.Select(s => s.Start.TimeOfDay).Should().Equal(TimeSpan.FromHours(10), TimeSpan.FromHours(10.5), TimeSpan.FromHours(11));
  }

  [Fact]
  public void Split_shifts_never_produce_slots_inside_the_break() {
    var slots = SlotCalculator.Calculate([At(10, 0, 13, 0), At(14, 0, 16, 0)], [], 60, 0, 60, Day);
    slots.Select(s => s.Start.Hour).Should().Equal(10, 11, 12, 14, 15);
  }

  [Fact]
  public void Service_longer_than_window_yields_nothing() =>
    SlotCalculator.Calculate([At(9, 0, 9, 30)], [], 60, 0, 30, Day).Should().BeEmpty();

  [Fact]
  public void Local_times_convert_to_utc_across_the_daylight_saving_change() {
    var zone = TimeHelper.Zone("America/New_York");
    TimeHelper.LocalToUtc(new DateOnly(2027, 3, 13), new TimeOnly(9, 0), zone).Should().Be(new DateTime(2027, 3, 13, 14, 0, 0, DateTimeKind.Utc));
    TimeHelper.LocalToUtc(new DateOnly(2027, 3, 14), new TimeOnly(9, 0), zone).Should().Be(new DateTime(2027, 3, 14, 13, 0, 0, DateTimeKind.Utc));
  }
}
