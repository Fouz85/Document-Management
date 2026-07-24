using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.Services;
using RecordsDestruction.Infrastructure.Identity;
using RecordsDestruction.Infrastructure.Persistence;
using RecordsDestruction.Infrastructure.Persistence.Interceptors;
using RecordsDestruction.Infrastructure.Services;

namespace RecordsDestruction.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddSingleton<SoftDeleteInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
            options.UseSqlServer(config.GetConnectionString("DefaultConnection"))
                   .AddInterceptors(sp.GetRequiredService<SoftDeleteInterceptor>()));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            // OWASP-aligned password policy
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 10;
            options.Password.RequireUppercase = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<JwtTokenService>();
        services.AddSingleton<WordComHost>();
        services.AddScoped<IPdfService, PdfServiceAdapter>();
        services.AddScoped<IExcelExportService, ExcelExportServiceAdapter>();
        services.AddScoped<IWordService, WordServiceAdapter>();
        services.AddScoped<DestructionRequestService>();
        services.AddScoped<DepartmentService>();
        return services;
    }
}
