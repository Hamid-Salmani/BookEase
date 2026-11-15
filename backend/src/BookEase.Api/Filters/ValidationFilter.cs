using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BookEase.Api.Filters;

public class ValidationFilter(IServiceProvider services) : IAsyncActionFilter {
  public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next) {
    var errors = new Dictionary<string, List<string>>();
    foreach (var argument in context.ActionArguments.Values) {
      if (argument == null) {
        continue;
      }
      var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
      if (services.GetService(validatorType) is not IValidator validator) {
        continue;
      }
      var result = await validator.ValidateAsync(new ValidationContext<object>(argument), context.HttpContext.RequestAborted);
      foreach (var failure in result.Errors) {
        var key = string.IsNullOrEmpty(failure.PropertyName) ? "request" : ToCamelCase(failure.PropertyName);
        if (errors.TryGetValue(key, out var list) == false) {
          list = [];
          errors[key] = list;
        }
        list.Add(failure.ErrorMessage);
      }
    }
    if (errors.Count == 0) {
      await next();
      return;
    }
    var problem = new ValidationProblemDetails(errors.ToDictionary(e => e.Key, e => e.Value.ToArray())) {
      Status = StatusCodes.Status400BadRequest,
      Title = "One or more validation errors occurred.",
    };
    context.Result = new BadRequestObjectResult(problem);
  }

  private static string ToCamelCase(string path) =>
    string.Join('.', path.Split('.').Select(part => part.Length == 0 ? part : char.ToLowerInvariant(part[0]) + part[1..]));
}
