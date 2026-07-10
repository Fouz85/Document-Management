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

        foreach (var role in new[] { "Admin", "User" })
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        // Admin credentials come from configuration / environment variables — NEVER hardcoded.
        // Seed:AdminEmail + Seed:AdminPassword (e.g. user-secrets in dev, env vars in prod).
        var adminEmail = config["Seed:AdminEmail"];
        var adminPassword = config["Seed:AdminPassword"];
        if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
        {
            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin is null)
            {
                admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "System Administrator",
                    Department = "IT",
                    IsActive = true
                };
                var result = await userManager.CreateAsync(admin, adminPassword);
                if (result.Succeeded)
                    await userManager.AddToRoleAsync(admin, "Admin");
            }
        }

        await SeedDepartmentsAsync(context);
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
