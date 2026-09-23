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

    /// <summary>Next sequential number for the current year, formatted "yyyy\NN" (e.g. 2026\03).</summary>
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

        return $"{prefix}{(max + 1):D2}";
    }

    /// <summary>Parses "YYYY\NN" into a sortable (year, number) pair — lets lists order by the actual
    /// destruction number (newest/highest first) instead of submission timestamp, which can drift out
    /// of step with the number once requests get edited, copied, or renumbered.</summary>
    private static (int year, int num) ParseDestructionNo(string? no)
    {
        if (string.IsNullOrEmpty(no)) return (0, 0);
        var parts = no.Split('\\');
        if (parts.Length != 2) return (0, 0);
        int.TryParse(parts[0], out var y);
        int.TryParse(parts[1], out var n);
        return (y, n);
    }

    public async Task<int> CreateAsync(SaveDestructionRequestDto dto, string userId, bool isAdmin)
    {
        var entity = new DestructionRequest
        {
            SubmittedByUserId = userId,
            Status = dto.SaveAsDraft ? RequestStatus.Draft : RequestStatus.Submitted,
            SubmittedAt = DateTime.UtcNow
        };
        Apply(dto, entity, isAdmin);
        // A draft doesn't get a real destruction number — otherwise every abandoned draft burns a
        // number out of the sequence, leaving a gap once it's later deleted or replaced.
        entity.DestructionNo = dto.SaveAsDraft ? null : await GetNextDestructionNoAsync();
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
        // Approved/destroyed requests are locked — no caller, including Admin, may edit them further
        // through this endpoint. Status changes go through UpdateStatusAsync; physical destruction
        // tracking goes through ToggleDestroyedAsync.
        if (entity.Status == RequestStatus.Approved || entity.IsDestroyed) return false;
        if (!isAdmin && entity.SubmittedByUserId != userId) return false;

        // Once submitted, a regular user can only edit again if the admin rejected it
        // (revision requested) or it was left as a draft — not while it's under review or approved.
        if (!isAdmin && entity.Status != RequestStatus.Draft && entity.Status != RequestStatus.Rejected)
            return false;

        // The user is addressing whatever the rejection note pointed out — it no longer applies
        // once they've edited the request, so don't carry it into the next review round.
        if (!isAdmin && entity.Status == RequestStatus.Rejected)
            entity.AdminNotes = null;

        // Soft-delete replaced record lines instead of removing them.
        foreach (var old in entity.Records.Where(r => !r.IsDeleted))
        {
            old.IsDeleted = true;
            old.DeletedAt = DateTime.UtcNow;
        }
        Apply(dto, entity, isAdmin);
        entity.Status = isAdmin
            ? (dto.SaveAsDraft ? RequestStatus.Draft : entity.Status == RequestStatus.Draft ? RequestStatus.Submitted : entity.Status)
            : (dto.SaveAsDraft ? RequestStatus.Draft : RequestStatus.Submitted);
        // A draft carries no real destruction number; one gets assigned the first time it stops
        // being a draft. A request that already has one (already submitted before) keeps it.
        if (dto.SaveAsDraft) entity.DestructionNo = null;
        else if (entity.DestructionNo is null) entity.DestructionNo = await GetNextDestructionNoAsync();
        entity.LastModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<DestructionRequestListItemDto>> ListAsync(string? userId, string? search, string? status)
    {
        var q = _db.DestructionRequests.AsNoTracking()
            .Include(r => r.Records.Where(x => !x.IsDeleted))
            .AsQueryable();
        if (userId is not null) q = q.Where(r => r.SubmittedByUserId == userId);
        // Drafts are private, unsubmitted work — never show another user's draft to an admin.
        else q = q.Where(r => r.Status != RequestStatus.Draft);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(r => (r.DestructionNo ?? "").Contains(search)
                          || r.Department.Contains(search)
                          || r.ResponsibleOfficer.Contains(search));

        var requests = await q.ToListAsync();
        return requests
            // A draft carries no destruction number yet — it's unfinished work the user still needs
            // to act on, so it belongs at the very top, not buried under every numbered request.
            .OrderByDescending(r => r.DestructionNo is null)
            .ThenByDescending(r => ParseDestructionNo(r.DestructionNo).year)
            .ThenByDescending(r => ParseDestructionNo(r.DestructionNo).num)
            .ThenByDescending(r => r.SubmittedAt) // ties (e.g. among drafts) fall back to newest first
            .Select(r => new DestructionRequestListItemDto
            {
                Id = r.Id,
                DestructionNo = r.DestructionNo,
                Department = r.Department,
                ResponsibleOfficer = r.ResponsibleOfficer,
                Status = r.Status,
                SubmittedAt = r.SubmittedAt,
                RecordsCount = r.Records.Count(x => !x.IsDeleted),
                AdminNotes = r.AdminNotes,
                SubmittedByUserId = r.SubmittedByUserId,
                IsDestroyed = r.IsDestroyed
            }).ToList();
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
            IsDestroyed = r.IsDestroyed,
            DestroyedAt = r.DestroyedAt,
            DestroyedByName = r.DestroyedByName,
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
        // Approved is terminal for this endpoint — the only further action on an Approved request
        // is ToggleDestroyedAsync (physical-destruction tracking).
        if (r.Status == RequestStatus.Approved) return false;
        r.Status = status;
        // A note only makes sense as "here's what to fix" — once approved there's nothing left
        // to revise, so it shouldn't linger into an approved request's history.
        r.AdminNotes = status == RequestStatus.Approved ? null : notes;
        r.LastModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>Marks (or un-marks) that the physical destruction has actually taken place — only
    /// meaningful for an Approved request. Returns null if the request doesn't exist or isn't
    /// Approved; otherwise the new IsDestroyed value.</summary>
    public async Task<bool?> ToggleDestroyedAsync(int id, string adminName)
    {
        var r = await _db.DestructionRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null || r.Status != RequestStatus.Approved) return null;

        r.IsDestroyed = !r.IsDestroyed;
        r.DestroyedAt = r.IsDestroyed ? DateTime.UtcNow : null;
        r.DestroyedByName = r.IsDestroyed ? adminName : null;
        r.LastModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return r.IsDestroyed;
    }

    /// <summary>Soft delete only — physical deletion is forbidden (audit & PDPPL). An admin (no
    /// restrictToUserId) can delete anything; a regular user can only delete their own, and only
    /// while it's still a draft — a submitted request is no longer theirs alone to remove.</summary>
    public async Task<bool> SoftDeleteAsync(int id, string? restrictToUserId = null)
    {
        var r = await _db.DestructionRequests.Include(x => x.Records).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return false;
        // Once physically destroyed, the record is the evidentiary trail of that destruction —
        // not even an Admin may soft-delete (hide) it.
        if (r.IsDestroyed) return false;
        if (restrictToUserId is not null && (r.SubmittedByUserId != restrictToUserId || r.Status != RequestStatus.Draft))
            return false;
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
            // Drafts are private, unsubmitted work — an admin's total shouldn't hint that one exists.
            TotalSubmissions = await q.CountAsync(r => r.Status != RequestStatus.Draft),
            SubmittedCount = await q.CountAsync(r => r.Status == RequestStatus.Submitted),
            ApprovedCount = await q.CountAsync(r => r.Status == RequestStatus.Approved),
            RejectedCount = await q.CountAsync(r => r.Status == RequestStatus.Rejected),
            DraftCount = await q.CountAsync(r => r.Status == RequestStatus.Draft),
            // Drafts are private, unsubmitted work — never show another user's draft to an admin.
            RecentSubmissions = (await q.Where(r => r.Status != RequestStatus.Draft)
                    .Include(r => r.Records.Where(x => !x.IsDeleted))
                    .ToListAsync())
                .OrderByDescending(r => ParseDestructionNo(r.DestructionNo).year)
                .ThenByDescending(r => ParseDestructionNo(r.DestructionNo).num)
                .ThenByDescending(r => r.SubmittedAt)
                .Take(5)
                .Select(r => new DestructionRequestListItemDto
                {
                    Id = r.Id, DestructionNo = r.DestructionNo, Department = r.Department,
                    ResponsibleOfficer = r.ResponsibleOfficer, Status = r.Status, SubmittedAt = r.SubmittedAt,
                    RecordsCount = r.Records.Count(x => !x.IsDeleted),
                    SubmittedByUserId = r.SubmittedByUserId,
                    IsDestroyed = r.IsDestroyed
                }).ToList()
        };
    }

    private static void Apply(SaveDestructionRequestDto dto, DestructionRequest e, bool isAdmin)
    {
        e.ConcernedParty = dto.ConcernedParty;
        // DestructionNo is assigned by the service (see CreateAsync/UpdateAsync), never taken from
        // client input, so it's deliberately not set here.
        e.Department = dto.Department;
        e.ResponsibleOfficer = dto.ResponsibleOfficer;
        e.Email = dto.Email;
        e.Phone = dto.Phone;
        e.StorageLocation = dto.StorageLocation;
        e.TotalVolume = dto.TotalVolume;
        e.RecordsFirstDate = dto.RecordsFirstDate;
        e.RecordsLastDate = dto.RecordsLastDate;

        // An admin reviewing/editing an existing request must not be able to alter or erase the
        // original submitter's own Creator Unit signature — only a brand-new request (e.Id == 0,
        // not yet saved) or the non-admin owner themselves may set it.
        if (!isAdmin || e.Id == 0)
        {
            e.CreatorUnitName = dto.CreatorUnit?.Name; e.CreatorUnitDate = dto.CreatorUnit?.Date;
            e.CreatorUnitSignature = dto.CreatorUnit?.Signature; e.CreatorUnitStamp = dto.CreatorUnit?.Stamp;
        }

        // The submitting employee only ever signs on behalf of their own Creator Unit — Legal
        // Affairs, Internal Audit, and Records Management are filled in later by those actual
        // departments during the approval workflow, and only an admin acting on their behalf may
        // set them. A non-admin caller's values for these are ignored, not just hidden client-side.
        if (isAdmin)
        {
            e.LegalAffairsName = dto.LegalAffairs?.Name; e.LegalAffairsDate = dto.LegalAffairs?.Date;
            e.LegalAffairsSignature = dto.LegalAffairs?.Signature; e.LegalAffairsStamp = dto.LegalAffairs?.Stamp;
            e.InternalAuditName = dto.InternalAudit?.Name; e.InternalAuditDate = dto.InternalAudit?.Date;
            e.InternalAuditSignature = dto.InternalAudit?.Signature; e.InternalAuditStamp = dto.InternalAudit?.Stamp;
            e.RecordsManagementName = dto.RecordsManagement?.Name; e.RecordsManagementDate = dto.RecordsManagement?.Date;
            e.RecordsManagementSignature = dto.RecordsManagement?.Signature; e.RecordsManagementStamp = dto.RecordsManagement?.Stamp;
        }

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
