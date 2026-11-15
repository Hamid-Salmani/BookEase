using System.Diagnostics;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BookEase.Api.Filters;
using BookEase.Api.Middleware;
using BookEase.Api.Services;
using BookEase.Application.Abstractions;
using BookEase.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace BookEase.Api.Extensions;

public static class ServiceCollectionExtensions {
  public const string CorsPolicy = "client";
  public const string AuthRateLimitPolicy = "auth";

  public static IServiceCollection AddApiServices(this IServiceCollection services) =>
    services
      .AddHttpContextAccessor()
      .AddScoped<ICurrentUser, CurrentUser>()
      .AddApiControllers()
      .AddProblemHandling()
      .AddJwtAuthentication()
      .AddCorsPolicy()
      .AddAuthRateLimiting()
      .AddSwagger();

  private static IServiceCollection AddApiControllers(this IServiceCollection services) {
    services.AddScoped<ValidationFilter>();
    services.AddControllers(options => {
      options.Filters.AddService<ValidationFilter>();
      options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    }).AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    return services;
  }

  private static IServiceCollection AddProblemHandling(this IServiceCollection services) {
    services.AddExceptionHandler<GlobalExceptionHandler>();
    services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
      context.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? context.HttpContext.TraceIdentifier);
    return services;
  }

  private static IServiceCollection AddJwtAuthentication(this IServiceCollection services) {
    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
    services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme).Configure<IOptions<JwtOptions>>((options, jwt) => {
      options.MapInboundClaims = false;
      options.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,
        ValidIssuer = jwt.Value.Issuer,
        ValidateAudience = true,
        ValidAudience = jwt.Value.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Value.Key)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = "name",
        RoleClaimType = "role",
      };
    });
    services.AddAuthorization();
    return services;
  }

  private static IServiceCollection AddCorsPolicy(this IServiceCollection services) {
    services.AddCors();
    services.AddOptions<CorsOptions>().Configure<IConfiguration>((options, config) => {
      var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
      options.AddPolicy(CorsPolicy, policy => policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod());
    });
    return services;
  }

  private static IServiceCollection AddAuthRateLimiting(this IServiceCollection services) {
    services.AddRateLimiter(_ => { });
    services.AddOptions<RateLimiterOptions>().Configure<IConfiguration>((options, config) => {
      var permitLimit = config.GetValue("RateLimiting:AuthPermitLimit", 20);
      options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
      options.AddPolicy(AuthRateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
      options.OnRejected = async (context, ct) => {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)) {
          context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        }
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails {
          Status = StatusCodes.Status429TooManyRequests,
          Title = "Too many requests",
          Detail = "Too many attempts. Please wait a minute and try again.",
        }, ct);
      };
    });
    services.Configure<ForwardedHeadersOptions>(options => {
      options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
      options.KnownNetworks.Clear();
      options.KnownProxies.Clear();
    });
    return services;
  }

  private static IServiceCollection AddSwagger(this IServiceCollection services) {
    services.AddEndpointsApiExplorer();
    services.AddSwaggerGen(options => {
      options.SwaggerDoc("v1", new OpenApiInfo { Title = "BookEase API", Version = "v1", Description = "Appointment booking platform for service businesses." });
      options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the access token returned by /api/auth/login.",
      });
      options.AddSecurityRequirement(new OpenApiSecurityRequirement {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [],
      });
    });
    return services;
  }
}
