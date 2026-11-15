namespace BookEase.Application.Common;

public abstract class AppException(int statusCode, string title, string detail) : Exception(detail) {
  public int StatusCode { get; } = statusCode;
  public string Title { get; } = title;
}

public class BadRequestException(string detail) : AppException(400, "Bad Request", detail);
public class UnauthorizedException(string detail) : AppException(401, "Unauthorized", detail);
public class ForbiddenException(string detail = "You do not have access to this resource.") : AppException(403, "Forbidden", detail);
public class NotFoundException(string detail) : AppException(404, "Not Found", detail);
public class ConflictException(string detail) : AppException(409, "Conflict", detail);
public class SlotUnavailableException() : AppException(409, "Slot unavailable", "The selected time slot is no longer available. Please choose another time.");
public class InvalidWebhookException(string detail) : AppException(400, "Invalid webhook", detail);
public class PaymentGatewayException(string detail) : AppException(502, "Payment provider error", detail);
