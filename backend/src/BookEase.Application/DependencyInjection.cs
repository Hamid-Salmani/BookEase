using BookEase.Application.Abstractions;
using BookEase.Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BookEase.Application;

public static class DependencyInjection {
  public static IServiceCollection AddApplication(this IServiceCollection services) {
    services.AddValidatorsFromAssemblyContaining<Validators.RegisterRequestValidator>();
    services.AddScoped<IAuthService, AuthService>();
    services.AddScoped<ICatalogService, CatalogService>();
    services.AddScoped<IServiceAdminService, ServiceAdminService>();
    services.AddScoped<IStaffAdminService, StaffAdminService>();
    services.AddScoped<IBusinessAdminService, BusinessAdminService>();
    services.AddScoped<IScheduleService, ScheduleService>();
    services.AddScoped<IAvailabilityService, AvailabilityService>();
    services.AddScoped<IBookingService, BookingService>();
    services.AddScoped<IBookingAdminService, BookingAdminService>();
    services.AddScoped<IPaymentService, PaymentService>();
    services.AddScoped<IReportService, ReportService>();
    services.AddScoped<IAuditService, AuditService>();
    services.AddScoped<IEmailService, EmailService>();
    services.AddScoped<IEmailDispatcher, EmailDispatcher>();
    services.AddScoped<IMaintenanceService, MaintenanceService>();
    return services;
  }
}
