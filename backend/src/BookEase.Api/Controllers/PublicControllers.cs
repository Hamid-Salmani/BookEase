using BookEase.Api.Extensions;
using BookEase.Application.Abstractions;
using BookEase.Application.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BookEase.Api.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase {
  [HttpPost("register"), EnableRateLimiting(ServiceCollectionExtensions.AuthRateLimitPolicy)]
  public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct) =>
    StatusCode(StatusCodes.Status201Created, await auth.RegisterAsync(request, ct));

  [HttpPost("login"), EnableRateLimiting(ServiceCollectionExtensions.AuthRateLimitPolicy)]
  public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct) =>
    Ok(await auth.LoginAsync(request, ct));

  [HttpPost("refresh"), EnableRateLimiting(ServiceCollectionExtensions.AuthRateLimitPolicy)]
  public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct) =>
    Ok(await auth.RefreshAsync(request, ct));

  [HttpPost("logout")]
  public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct) {
    await auth.LogoutAsync(request, ct);
    return NoContent();
  }

  [HttpGet("me"), Authorize]
  public async Task<ActionResult<UserDto>> Me(CancellationToken ct) => Ok(await auth.MeAsync(ct));
}

[ApiController, Route("api")]
public class CatalogController(ICatalogService catalog, IAvailabilityService availability) : ControllerBase {
  [HttpGet("business")]
  public async Task<ActionResult<BusinessDto>> Business(CancellationToken ct) => Ok(await catalog.GetBusinessAsync(ct));

  [HttpGet("config")]
  public ActionResult<PublicConfigDto> Config() => Ok(catalog.GetPublicConfig());

  [HttpGet("services")]
  public async Task<ActionResult<IReadOnlyList<ServiceDto>>> Services(CancellationToken ct) => Ok(await catalog.ListServicesAsync(ct));

  [HttpGet("services/{id:guid}")]
  public async Task<ActionResult<ServiceDto>> Service(Guid id, CancellationToken ct) => Ok(await catalog.GetServiceAsync(id, ct));

  [HttpGet("staff")]
  public async Task<ActionResult<IReadOnlyList<StaffDto>>> Staff([FromQuery] Guid? serviceId, CancellationToken ct) => Ok(await catalog.ListStaffAsync(serviceId, ct));

  [HttpGet("availability")]
  public async Task<ActionResult<AvailabilityDto>> Availability([FromQuery] AvailabilityQuery query, CancellationToken ct) => Ok(await availability.GetSlotsAsync(query, ct));

  [HttpGet("availability/month")]
  public async Task<ActionResult<MonthAvailabilityDto>> AvailabilityMonth([FromQuery] MonthAvailabilityQuery query, CancellationToken ct) => Ok(await availability.GetMonthAsync(query, ct));
}

[ApiController, Route("api/payments")]
public class PaymentsController(IPaymentService payments) : ControllerBase {
  [HttpPost("webhook"), AllowAnonymous]
  public async Task<IActionResult> Webhook(CancellationToken ct) {
    using var reader = new StreamReader(Request.Body);
    var payload = await reader.ReadToEndAsync(ct);
    await payments.HandleWebhookAsync(payload, Request.Headers["Stripe-Signature"].ToString(), ct);
    return Ok();
  }

  [HttpPost("demo/{paymentIntentId}/succeed"), Authorize]
  public async Task<IActionResult> DemoSucceed(string paymentIntentId, CancellationToken ct) {
    await payments.SimulateSuccessAsync(paymentIntentId, ct);
    return NoContent();
  }
}
