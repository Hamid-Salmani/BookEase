using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using BookEase.Application.Dtos;
using FluentAssertions;

namespace BookEase.Tests.Infrastructure;

public static class ApiHelpers {
  public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

  public static async Task<T> ReadAsync<T>(this HttpResponseMessage response) {
    var value = await response.Content.ReadFromJsonAsync<T>(Json);
    value.Should().NotBeNull();
    return value!;
  }

  public static Task<HttpResponseMessage> PostJsonAsync<T>(this HttpClient client, string url, T body) => client.PostAsJsonAsync(url, body, Json);

  public static async Task<HttpClient> LoginAsync(this BookEaseFactory factory, string email, string password) {
    var client = factory.CreateClient();
    var response = await client.PostJsonAsync("/api/auth/login", new LoginRequest(email, password));
    response.EnsureSuccessStatusCode();
    var auth = await response.ReadAsync<AuthResponse>();
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
    return client;
  }

  public static Task<HttpClient> AsCustomerAsync(this BookEaseFactory factory) => factory.LoginAsync("customer@demo.com", "Customer123!");

  public static Task<HttpClient> AsAdminAsync(this BookEaseFactory factory) => factory.LoginAsync("admin@demo.com", "Admin123!");

  public static async Task<ServiceDto> GetServiceAsync(this HttpClient client, string name) {
    var services = await (await client.GetAsync("/api/services")).ReadAsync<List<ServiceDto>>();
    return services.First(s => s.Name == name);
  }

  public static async Task<StaffDto> GetStaffAsync(this HttpClient client, string name) {
    var staff = await (await client.GetAsync("/api/staff")).ReadAsync<List<StaffDto>>();
    return staff.First(s => s.Name == name);
  }

  public static async Task<SlotDto> FindSlotAsync(this HttpClient client, Guid serviceId, Guid? staffId, int skip = 0) {
    for (var day = 2; day < 30; day++) {
      var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(day));
      var url = $"/api/availability?serviceId={serviceId}&date={date:yyyy-MM-dd}" + (staffId == null ? string.Empty : $"&staffId={staffId}");
      var availability = await (await client.GetAsync(url)).ReadAsync<AvailabilityDto>();
      if (availability.Slots.Count > skip) {
        return availability.Slots[skip];
      }
    }
    throw new InvalidOperationException("No available slot found in the next 30 days.");
  }

  public static async Task<CreateBookingResponse> BookAsync(this HttpClient client, ServiceDto service, StaffDto? staff, SlotDto slot) {
    var response = await client.PostJsonAsync("/api/bookings", new CreateBookingRequest(service.Id, staff?.Id, slot.StartUtc, "test"));
    response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);
    return await response.ReadAsync<CreateBookingResponse>();
  }
}

public static class WebhookHelpers {
  public static async Task<HttpResponseMessage> SendWebhookAsync(this BookEaseFactory factory, string paymentIntentId, string type = "payment_succeeded", string? eventId = null, string signature = "demo") {
    var client = factory.CreateClient();
    var request = new HttpRequestMessage(HttpMethod.Post, "/api/payments/webhook") {
      Content = JsonContent.Create(new { id = eventId ?? $"evt_{Guid.NewGuid():N}", type, paymentIntentId }),
    };
    request.Headers.Add("Stripe-Signature", signature);
    return await client.SendAsync(request);
  }

  public static async Task<CreateBookingResponse> BookAndPayAsync(this BookEaseFactory factory, HttpClient client, ServiceDto service, StaffDto staff, SlotDto slot) {
    var created = await client.BookAsync(service, staff, slot);
    created.Payment.Should().NotBeNull();
    (await factory.SendWebhookAsync(created.Payment!.PaymentIntentId)).EnsureSuccessStatusCode();
    return created;
  }
}
