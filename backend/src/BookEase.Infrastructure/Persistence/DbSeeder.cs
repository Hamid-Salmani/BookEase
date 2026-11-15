using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Domain.Entities;
using BookEase.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookEase.Infrastructure.Persistence;

public static class DbSeeder {
  public const string AdminPassword = "Admin123!";
  public const string CustomerPassword = "Customer123!";
  public const string StaffPassword = "Staff123!";

  public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher, DateTime now, CancellationToken ct = default) {
    if (await db.Businesses.AnyAsync(ct)) {
      return;
    }
    var business = new Business {
      Name = "Serenity Wellness Studio",
      Description = "Massage, skin care, hair and coaching in one calm, welcoming space.",
      TimeZoneId = "America/New_York",
      Currency = "usd",
      ContactEmail = "hello@serenity-demo.com",
    };
    var zone = TimeHelper.Zone(business.TimeZoneId);

    var consultation = NewService("Initial Consultation", "A relaxed 30-minute conversation to understand your goals and recommend a plan.", 30, 10, 4000);
    var massage = NewService("Deep Tissue Massage", "Targeted pressure to release chronic tension in muscles and connective tissue.", 60, 15, 9000);
    var haircut = NewService("Haircut & Style", "Precision cut, wash and blow-dry tailored to your face shape and lifestyle.", 45, 10, 5500);
    var coaching = NewService("Wellness Coaching Session", "One-to-one coaching on habits, stress and sustainable energy.", 50, 10, 7500);
    var facial = NewService("Skin Care Facial", "Deep cleanse, exfoliation and hydration with professional-grade products.", 60, 15, 8500);
    var services = new[] { consultation, massage, haircut, coaching, facial };

    var adminHash = hasher.Hash(AdminPassword);
    var customerHash = hasher.Hash(CustomerPassword);
    var staffHash = hasher.Hash(StaffPassword);
    var admin = new User { Email = "admin@demo.com", PasswordHash = adminHash, FullName = "Alex Admin", Role = UserRole.Admin };
    var demoCustomer = new User { Email = "customer@demo.com", PasswordHash = customerHash, FullName = "Casey Customer", Phone = "+1 555 0100" };
    var staffUser = new User { Email = "staff@demo.com", PasswordHash = staffHash, FullName = "Emma Collins", Role = UserRole.Staff };
    var customers = new List<User> { demoCustomer };
    foreach (var (name, email) in new[] { ("Alice Johnson", "alice@example.com"), ("Brian Smith", "brian@example.com"), ("Chloe Martin", "chloe@example.com"), ("Daniel Lee", "daniel@example.com"), ("Elena Rossi", "elena@example.com"), ("Farid Haddad", "farid@example.com") }) {
      customers.Add(new User { Email = email, PasswordHash = customerHash, FullName = name });
    }

    var emma = new Staff { Name = "Emma Collins", Title = "Wellness Coach & Esthetician", Bio = "Ten years helping clients feel their best, with a calm and structured approach.", User = staffUser };
    var liam = new Staff { Name = "Liam Carter", Title = "Massage Therapist & Stylist", Bio = "Sports-massage specialist and precision stylist." };
    var sofia = new Staff { Name = "Sofia Martinez", Title = "Senior Stylist & Esthetician", Bio = "Colour, cuts and glowing skin - Sofia does it all." };
    var staffOffers = new Dictionary<Staff, Service[]> {
      [emma] = [consultation, coaching, facial],
      [liam] = [massage, haircut, consultation],
      [sofia] = [haircut, facial, massage, coaching],
    };
    foreach (var (member, offered) in staffOffers) {
      foreach (var service in offered) {
        member.StaffServices.Add(new StaffService { Staff = member, Service = service });
      }
    }
    foreach (var day in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday }) {
      emma.WorkingHours.Add(Hours(day, 9, 17));
      liam.WorkingHours.Add(Hours(day, 10, 13));
      liam.WorkingHours.Add(Hours(day, 14, 18));
    }
    foreach (var day in new[] { DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday }) {
      sofia.WorkingHours.Add(Hours(day, 9, 15));
    }
    sofia.WorkingHours.Add(Hours(DayOfWeek.Saturday, 10, 14));

    var today = TimeHelper.LocalDate(now, zone);
    var trainingDay = today.AddDays(9);
    sofia.TimeOffs.Add(new TimeOff {
      StartUtc = TimeHelper.StartOfDayUtc(trainingDay, zone),
      EndUtc = TimeHelper.StartOfDayUtc(trainingDay.AddDays(1), zone),
      Reason = "Training day",
    });

    db.Businesses.Add(business);
    db.Services.AddRange(services);
    db.Users.AddRange([admin, ..customers]);
    db.StaffMembers.AddRange(emma, liam, sofia);

    var startHours = new Dictionary<Staff, int[]> { [emma] = [9, 11, 13, 15], [liam] = [10, 14, 16], [sofia] = [9, 11, 13] };
    var rng = new Random(42);
    foreach (var offset in Enumerable.Range(-28, 43)) {
      var date = today.AddDays(offset);
      foreach (var member in new[] { emma, liam, sofia }) {
        var windows = member.WorkingHours.Where(w => w.DayOfWeek == date.DayOfWeek).ToList();
        if (windows.Count == 0 || (member == sofia && date == trainingDay)) {
          continue;
        }
        foreach (var hour in startHours[member]) {
          if (rng.NextDouble() > 0.55) {
            continue;
          }
          var service = staffOffers[member][rng.Next(staffOffers[member].Length)];
          var start = new TimeOnly(hour, 0);
          var end = start.AddMinutes(service.DurationMinutes);
          if (windows.Any(w => w.StartTime <= start && end <= w.EndTime && end > start) == false) {
            continue;
          }
          var booking = BuildBooking(member, service, customers[rng.Next(customers.Count)], TimeHelper.LocalToUtc(date, start, zone), business.Currency, now, rng);
          db.Bookings.Add(booking);
        }
      }
    }
    await db.SaveChangesAsync(ct);
  }

  private static Booking BuildBooking(Staff staff, Service service, User customer, DateTime startUtc, string currency, DateTime now, Random rng) {
    var roll = rng.NextDouble();
    var isPast = startUtc < now;
    var status = isPast
      ? roll < 0.08 ? BookingStatus.Cancelled : roll < 0.13 ? BookingStatus.NoShow : BookingStatus.Completed
      : roll < 0.06 ? BookingStatus.Cancelled : BookingStatus.Confirmed;
    var bookedAt = Min(startUtc.AddDays(-rng.Next(1, 6)).AddHours(rng.Next(0, 8)), now.AddMinutes(-5));
    var booking = new Booking {
      Customer = customer,
      Service = service,
      Staff = staff,
      Status = status,
      PriceCents = service.PriceCents,
      Currency = currency,
      CreatedAt = bookedAt,
      Notes = rng.NextDouble() < 0.2 ? "First visit, looking forward to it!" : null,
    };
    booking.SetTimes(startUtc, service.DurationMinutes, service.BufferMinutes);
    if (status == BookingStatus.Cancelled) {
      booking.CancelledAtUtc = Min(startUtc.AddDays(-2), now.AddMinutes(-1));
      booking.CancellationReason = "Change of plans";
    }
    booking.Payment = new Payment {
      Booking = booking,
      PaymentIntentId = $"pi_seed_{Guid.NewGuid():N}",
      AmountCents = service.PriceCents,
      Currency = currency,
      Status = status == BookingStatus.Cancelled ? PaymentStatus.Refunded : PaymentStatus.Succeeded,
      RefundedCents = status == BookingStatus.Cancelled ? service.PriceCents : 0,
      PaidAtUtc = bookedAt.AddMinutes(3),
      CreatedAt = bookedAt,
    };
    return booking;
  }

  private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;

  private static Service NewService(string name, string description, int duration, int buffer, int priceCents) =>
    new() { Name = name, Description = description, DurationMinutes = duration, BufferMinutes = buffer, PriceCents = priceCents };

  private static WorkingHours Hours(DayOfWeek day, int startHour, int endHour) =>
    new() { DayOfWeek = day, StartTime = new TimeOnly(startHour, 0), EndTime = new TimeOnly(endHour, 0) };
}
