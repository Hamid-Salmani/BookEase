using BookEase.Application.Common;
using BookEase.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BookEase.Api.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IProblemDetailsService problemDetails) : IExceptionHandler {
  public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken) {
    if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested) {
      context.Response.StatusCode = 499;
      return true;
    }
    var (status, title, detail) = exception switch {
      AppException app => (app.StatusCode, app.Title, app.Message),
      DomainException domain => (StatusCodes.Status422UnprocessableEntity, "Business rule violation", domain.Message),
      BadHttpRequestException => (StatusCodes.Status400BadRequest, "Bad Request", "The request was malformed."),
      _ => (StatusCodes.Status500InternalServerError, "Server Error", "An unexpected error occurred. Please try again later."),
    };
    if (status >= 500) {
      logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path.Value);
    } else {
      logger.LogInformation("Request rejected with {Status}: {Title}", status, title);
    }
    context.Response.StatusCode = status;
    return await problemDetails.TryWriteAsync(new ProblemDetailsContext {
      HttpContext = context,
      Exception = exception,
      ProblemDetails = new ProblemDetails { Status = status, Title = title, Detail = detail },
    });
  }
}
