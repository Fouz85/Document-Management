namespace RecordsDestruction.Domain.Enums;

public static class RequestStatus
{
    public const string Draft = "Draft";
    public const string Submitted = "Submitted";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";

    public static readonly string[] All = { Draft, Submitted, Approved, Rejected };
    public static bool IsValid(string status) => All.Contains(status);
}
