using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecordsDestruction.Domain.Entities;
using RecordsDestruction.Infrastructure.Identity;

namespace RecordsDestruction.Infrastructure.Persistence.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        foreach (var role in new[] { "Admin", "User", "LegalAffairs", "InternalAudit" })
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        // Credentials come from configuration / environment variables — NEVER hardcoded.
        // Seed:<Role>Email + Seed:<Role>Password (e.g. user-secrets in dev, env vars in prod).
        await SeedNamedAccountAsync(userManager, config, "Seed:AdminEmail", "Seed:AdminPassword",
            "Admin", "System Administrator", "IT");
        await SeedNamedAccountAsync(userManager, config, "Seed:LegalAffairsEmail", "Seed:LegalAffairsPassword",
            "LegalAffairs", "Legal Affairs Director", "Legal Affairs");
        await SeedNamedAccountAsync(userManager, config, "Seed:InternalAuditEmail", "Seed:InternalAuditPassword",
            "InternalAudit", "Internal Audit Director", "Internal Audit");

        await SeedDepartmentsAsync(context);
    }

    /// <summary>No-op if either config key is blank, or if the account already exists — never updates
    /// an existing account's role/password on subsequent runs.</summary>
    private static async Task SeedNamedAccountAsync(UserManager<ApplicationUser> userManager, IConfiguration config,
        string emailKey, string passwordKey, string role, string defaultFullName, string defaultDepartment)
    {
        var email = config[emailKey];
        var password = config[passwordKey];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null) return;

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = defaultFullName,
            Department = defaultDepartment,
            IsActive = true
        };
        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(user, role);
    }

    private static async Task SeedDepartmentsAsync(ApplicationDbContext context)
    {
        if (await context.Departments.AnyAsync()) return;

        var path = Path.Combine(AppContext.BaseDirectory, "Persistence", "Seed", "departments.json");
        if (!File.Exists(path))
            path = Path.Combine(Directory.GetCurrentDirectory(), "..", "RecordsDestruction.Infrastructure", "Persistence", "Seed", "departments.json");
        if (!File.Exists(path)) return;

        using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(path));
        var root = doc.RootElement;

        var deptByName = new Dictionary<string, Department>();
        foreach (var d in root.GetProperty("departments").EnumerateArray())
        {
            var dept = new Department { Name = d.GetProperty("name").GetString()! };
            deptByName[dept.Name] = dept;
            context.Departments.Add(dept);
        }
        await context.SaveChangesAsync();

        var subByKey = new Dictionary<string, SubDepartment>();
        var pending = root.GetProperty("subDepartments").EnumerateArray().ToList();

        // Two passes: roots first, then children referencing parents by name within the same department.
        foreach (var pass in new[] { true, false })
        {
            foreach (var s in pending)
            {
                var deptName = s.GetProperty("deptName").GetString()!;
                var name = s.GetProperty("name").GetString()!;
                var parentName = s.TryGetProperty("parentName", out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;
                var isRoot = parentName is null;
                if (pass != isRoot) continue;

                var sub = new SubDepartment
                {
                    Name = name,
                    DepartmentId = deptByName[deptName].Id,
                    ParentId = parentName is null ? null : subByKey.GetValueOrDefault($"{deptName}|{parentName}")?.Id
                };
                context.SubDepartments.Add(sub);
                await context.SaveChangesAsync();
                subByKey[$"{deptName}|{name}"] = sub;
            }
        }
    }
}
