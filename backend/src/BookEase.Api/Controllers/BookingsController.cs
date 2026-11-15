using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using BookEase.Application.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookEase.Api.Controllers;

[ApiController, Route("api/bookings"), Authorize]
public class BookingsController(IBookingService bookings) : ControllerBase {
  [HttpPost]
  public async Task<ActionResult<CreateBookingResponse>> Create(CreateBookingRequest request, CancellationToken ct) {
    var response = await bookings.CreateAsync(request, ct);
    return CreatedAtAction(nameof(Get), new { id = response.Booking.Id }, response);
  }

  [HttpGet("mine")]
  public async Task<ActionResult<PagedResult<BookingDto>>> Mine([FromQuery] MyBookingsQuery query, CancellationToken ct) => Ok(await bookings.ListMineAsync(query, ct));

  [HttpGet("{id:guid}")]
  public async Task<ActionResult<BookingDto>> Get(Guid id, CancellationToken ct) => Ok(await bookings.GetAsync(id, ct));

  [HttpGet("{id:guid}/cancellation-quote")]
  public async Task<ActionResult<CancellationQuoteDto>> Quote(Guid id, CancellationToken ct) => Ok(await bookings.GetCancellationQuoteAsync(id, ct));

  [HttpPost("{id:guid}/cancel")]
  public async Task<ActionResult<BookingDto>> Cancel(Guid id, CancelBookingRequest request, CancellationToken ct) => Ok(await bookings.CancelAsync(id, request, ct));

  [HttpPost("{id:guid}/reschedule")]
  public async Task<ActionResult<BookingDto>> Reschedule(Guid id, RescheduleRequest request, CancellationToken ct) => Ok(await bookings.RescheduleAsync(id, request, ct));
}
