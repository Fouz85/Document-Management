using Microsoft.EntityFrameworkCore;
using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Application.DTOs;
using RecordsDestruction.Domain.Entities;
using RecordsDestruction.Domain.Enums;

namespace RecordsDestruction.Application.Services;

public class DestructionRequestService
{
    private readonly IApplicationDbContext _db;
    public DestructionRequestService(IApplicationDbContext db) => _db = db;

    /// <summary>Next sequential number for the current year, formatted "yyyy\NNN" (e.g. 2026\001).</summary>
    public async Task<string> GetNextDestructionNoAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"{year}\\";
        var numbers = await _db.DestructionRequests
            .Where(r => r.DestructionNo != null && r.DestructionNo.StartsWith(prefix))
            .Select(r => r.DestructionNo!)
            .ToListAsync();

        var max = 0;
        foreach (var no in numbers)
            if (int.TryParse(no.Substring(prefix.Length), out var n) && n > max) max = n;

        return $"{prefix}{(max + 1):D3}";
    }

    public async Task<int> CreateAsync(SaveDestructionRequestDto dto, string userId)
    {
        var entity = new DestructionRequest
        {
            SubmittedByUserId = userId,
            Status = dto.SaveAsDraft ? RequestStatus.Draft : RequestStatus.Submitted,
            SubmittedAt = DateTime.UtcNow
        };
        Apply(dto, entity);
        _db.DestructionRequests.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> UpdateAsync(int id, SaveDestructionRequestDto dto, string userId, bool isAdmin)
    {
        var entity = await _db.DestructionRequests
            .Include(r => r.Records)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (entity is null) return false;
        if (!isAdmin && entity.SubmittedByUserId != userId) return false;

        // Once submitted, a regular user can only edit again if the admin rejected it
        // (revision requested) or it was left as a draft — not while it's under review or approved.
        if (!isAdmin && entity.Status != RequestStatus.Draft && entity.Status != RequestStatus.Rejected)
            return false;

        // Soft-delete replaced record lines instead of removing them.
        foreach (var old in entity.Records.Where(r => !r.IsDeleted))
        {
            old.IsDeleted = true;
            old.DeletedAt = DateTime.UtcNow;
        }
        Apply(dto, entity);
        entity.Status = isAdmin
            ? (dto.SaveAsDraft ? RequestStatus.Draft : entity.Status == RequestStatus.Draft ? RequestStatus.Submitted : entity.Status)
            : (dto.SaveAsDraft ? RequestStatus.Draft : RequestStatus.Submitted);
        entity.LastModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<DestructionRequestListItemDto>> ListAsync(string? userId, string? search, string? status)
    {
        var q = _db.DestructionRequests.AsNoTracking().AsQueryable();
        if (userId is not null) q = q.Where(r => r.SubmittedByUserId == userId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(r => (r.DestructionNo ?? "").Contains(search)
                          || r.Department.Contains(search)
                          || r.ResponsibleOfficer.Contains(search));

        return await q.OrderByDescending(r => r.SubmittedAt)
            .Select(r => new DestructionRequestListItemDto
            {
                Id = r.Id,
                DestructionNo = r.DestructionNo,
                Department = r.Department,
                ResponsibleOfficer = r.ResponsibleOfficer,
                Status = r.Status,
                SubmittedAt = r.SubmittedAt,
                RecordsCount = r.Records.Count(x => !x.IsDeleted),
                AdminNotes = r.AdminNotes
            }).ToListAsync();
    }

    public async Task<DestructionRequestDetailsDto?> GetAsync(int id, string? restrictToUserId)
    {
        var r = await _db.DestructionRequests.AsNoTracking()
            .Include(x => x.Records.Where(rec => !rec.IsDeleted))
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return null;
        if (restrictToUserId is not null && r.SubmittedByUserId != restrictToUserId) return null;

        return new DestructionRequestDetailsDto
        {
            Id = r.Id,
            Status = r.Status,
            AdminNotes = r.AdminNotes,
            SubmittedAt = r.SubmittedAt,
            SubmittedByUserId = r.SubmittedByUserId,
            ConcernedParty = r.ConcernedParty,
            DestructionNo = r.DestructionNo ?? string.Empty,
            Department = r.Department,
            ResponsibleOfficer = r.ResponsibleOfficer,
            Email = r.Email,
            Phone = r.Phone,
            StorageLocation = r.StorageLocation,
            TotalVolume = r.TotalVolume,
            RecordsFirstDate = r.RecordsFirstDate,
            RecordsLastDate = r.RecordsLastDate,
            CreatorUnit = new SignatureBlockDto { Name = r.CreatorUnitName, Date = r.CreatorUnitDate, Signature = r.CreatorUnitSignature, Stamp = r.CreatorUnitStamp },
            LegalAffairs = new SignatureBlockDto { Name = r.LegalAffairsName, Date = r.LegalAffairsDate, Signature = r.LegalAffairsSignature, Stamp = r.LegalAffairsStamp },
            InternalAudit = new SignatureBlockDto { Name = r.InternalAuditName, Date = r.InternalAuditDate, Signature = r.InternalAuditSignature, Stamp = r.InternalAuditStamp },
            RecordsManagement = new SignatureBlockDto { Name = r.RecordsManagementName, Date = r.RecordsManagementDate, Signature = r.RecordsManagementSignature, Stamp = r.RecordsManagementStamp },
            Records = r.Records.OrderBy(x => x.SerialNo).Select(x => new DestructionRecordDto
            {
                SerialNo = x.SerialNo, RecordsTitle = x.RecordsTitle, OriginalOrCopy = x.OriginalOrCopy,
                RecordsType = x.RecordsType, StorageMedium = x.StorageMedium, RetentionRuleNo = x.RetentionRuleNo,
                FirstDate = x.FirstDate, LastDate = x.LastDate, RecordsVolume = x.RecordsVolume, Remarks = x.Remarks
            }).ToList()
        };
    }

    public async Task<bool> UpdateStatusAsync(int id, string status, string? notes)
    {
        if (!RequestStatus.IsValid(status)) return false;
        var r = await _db.DestructionRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return false;
        r.Status = status;
        r.AdminNotes = notes;
        r.LastModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>Soft delete only — physical deletion is forbidden (audit & PDPPL).</summary>
    public async Task<bool> SoftDeleteAsync(int id)
    {
        var r = await _db.DestructionRequests.Include(x => x.Records).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return false;
        r.IsDeleted = true;
        r.DeletedAt = DateTime.UtcNow;
        foreach (var rec in r.Records) { rec.IsDeleted = true; rec.DeletedAt = DateTime.UtcNow; }
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<DashboardDto> GetDashboardAsync()
    {
        var q = _db.DestructionRequests.AsNoTracking();
        return new DashboardDto
        {
            TotalSubmissions = await q.CountAsync(),
            SubmittedCount = await q.CountAsync(r => r.Status == RequestStatus.Submitted),
            ApprovedCount = await q.CountAsync(r => r.Status == RequestStatus.Approved),
            RejectedCount = await q.CountAsync(r => r.Status == RequestStatus.Rejected),
            DraftCount = await q.CountAsync(r => r.Status == RequestStatus.Draft),
            RecentSubmissions = await q.OrderByDescending(r => r.SubmittedAt).Take(5)
                .Select(r => new DestructionRequestListItemDto
                {
                    Id = r.Id, DestructionNo = r.DestructionNo, Department = r.Department,
                    ResponsibleOfficer = r.ResponsibleOfficer, Status = r.Status, SubmittedAt = r.SubmittedAt,
                    RecordsCount = r.Records.Count(x => !x.IsDeleted)
                }).ToListAsync()
        };
    }

    private static void Apply(SaveDestructionRequestDto dto, DestructionRequest e)
    {
        e.ConcernedParty = dto.ConcernedParty;
        e.DestructionNo = dto.DestructionNo;
        e.Department = dto.Department;
        e.ResponsibleOfficer = dto.ResponsibleOfficer;
        e.Email = dto.Email;
        e.Phone = dto.Phone;
        e.StorageLocation = dto.StorageLocation;
        e.TotalVolume = dto.TotalVolume;
        e.RecordsFirstDate = dto.RecordsFirstDate;
        e.RecordsLastDate = dto.RecordsLastDate;

        e.CreatorUnitName = dto.CreatorUnit?.Name; e.CreatorUnitDate = dto.CreatorUnit?.Date;
        e.CreatorUnitSignature = dto.CreatorUnit?.Signature; e.CreatorUnitStamp = dto.CreatorUnit?.Stamp;
        e.LegalAffairsName = dto.LegalAffairs?.Name; e.LegalAffairsDate = dto.LegalAffairs?.Date;
        e.LegalAffairsSignature = dto.LegalAffairs?.Signature; e.LegalAffairsStamp = dto.LegalAffairs?.Stamp;
        e.InternalAuditName = dto.InternalAudit?.Name; e.InternalAuditDate = dto.InternalAudit?.Date;
        e.InternalAuditSignature = dto.InternalAudit?.Signature; e.InternalAuditStamp = dto.InternalAudit?.Stamp;
        e.RecordsManagementName = dto.RecordsManagement?.Name; e.RecordsManagementDate = dto.RecordsManagement?.Date;
        e.RecordsManagementSignature = dto.RecordsManagement?.Signature; e.RecordsManagementStamp = dto.RecordsManagement?.Stamp;

        foreach (var rec in dto.Records)
        {
            e.Records.Add(new DestructionRecord
            {
                SerialNo = rec.SerialNo, RecordsTitle = rec.RecordsTitle, OriginalOrCopy = rec.OriginalOrCopy,
                RecordsType = rec.RecordsType, StorageMedium = rec.StorageMedium, RetentionRuleNo = rec.RetentionRuleNo,
                FirstDate = rec.FirstDate, LastDate = rec.LastDate, RecordsVolume = rec.RecordsVolume, Remarks = rec.Remarks
            });
        }
    }
}
