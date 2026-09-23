using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Domain.Entities;
using RecordsDestruction.Infrastructure.Identity;

namespace RecordsDestruction.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<SubDepartment> SubDepartments => Set<SubDepartment>();
    public DbSet<DestructionRequest> DestructionRequests => Set<DestructionRequest>();
    public DbSet<DestructionRecord> DestructionRecords => Set<DestructionRecord>();
    public DbSet<Approval> Approvals => Set<Approval>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Department>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        builder.Entity<SubDepartment>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Department).WithMany(d => d.SubDepartments)
             .HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Parent).WithMany(p => p.Children)
             .HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        builder.Entity<DestructionRequest>(e =>
        {
            e.Property(x => x.Status).HasMaxLength(50);
            e.Property(x => x.TotalVolume).HasPrecision(18, 4);
            // Restrict, not Cascade: users are only ever soft-deleted (AdminController.DeleteUser),
            // so this FK should never actually fire a delete-time action — it exists purely to
            // guarantee SubmittedByUserId always points at a real account going forward.
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.SubmittedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        builder.Entity<DestructionRecord>(e =>
        {
            e.Property(x => x.RecordsVolume).HasPrecision(18, 4);
            e.HasOne(x => x.DestructionRequest).WithMany(r => r.Records)
             .HasForeignKey(x => x.DestructionRequestId).OnDelete(DeleteBehavior.Cascade);
            // Filter must match parent's filter to avoid orphan warnings.
            e.HasQueryFilter(x => !x.IsDeleted && !x.DestructionRequest!.IsDeleted);
        });

        builder.Entity<Approval>(e =>
        {
            e.Property(x => x.ApproverRole).HasMaxLength(100).IsRequired();
            e.Property(x => x.ApproverName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Status).HasMaxLength(50).IsRequired();
            e.HasOne(x => x.DestructionRequest).WithMany(r => r.Approvals)
             .HasForeignKey(x => x.DestructionRequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ApproverUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted && !x.DestructionRequest!.IsDeleted);
        });

        builder.Entity<ApplicationUser>(e => e.HasQueryFilter(u => !u.IsDeleted));

        builder.Entity<RefreshToken>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
