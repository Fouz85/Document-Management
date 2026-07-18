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
    public DbSet<PasswordResetRequest> PasswordResetRequests => Set<PasswordResetRequest>();

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
            e.Property(x => x.TotalVolume).HasPrecision(18, 2);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        builder.Entity<DestructionRecord>(e =>
        {
            e.Property(x => x.RecordsVolume).HasPrecision(18, 2);
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
            e.HasQueryFilter(x => !x.IsDeleted && !x.DestructionRequest!.IsDeleted);
        });

        builder.Entity<PasswordResetRequest>(e =>
        {
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        builder.Entity<ApplicationUser>(e => e.HasQueryFilter(u => !u.IsDeleted));
    }
}
