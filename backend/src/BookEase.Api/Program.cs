using BookEase.Api.Extensions;
using BookEase.Application;
using BookEase.Infrastructure;
using BookEase.Infrastructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
  .ReadFrom.Configuration(context.Configuration)
  .ReadFrom.Services(services)
  .Enrich.FromLogContext());

builder.Services
  .AddApplication()
  .AddInfrastructure()
  .AddBackgroundJobs()
  .AddApiServices();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseSerilogRequestLogging();
app.Use(async (context, next) => {
  context.Response.Headers.XContentTypeOptions = "nosniff";
  context.Response.Headers.XFrameOptions = "DENY";
  context.Response.Headers["Referrer-Policy"] = "no-referrer";
  await next();
});

if (app.Environment.IsDevelopment() || app.Configuration.GetValue("Swagger:Enabled", false)) {
  app.UseSwagger();
  app.UseSwaggerUI();
}

app.UseCors(ServiceCollectionExtensions.CorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

await DatabaseInitializer.InitializeAsync(app.Services);
await app.RunAsync();

public partial class Program;
