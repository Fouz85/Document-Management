namespace RecordsDestruction.Infrastructure.Services
{
    /// <summary>Single source of truth for how a record's raw field values (RecordsType, StorageMedium,
    /// dates) are shown in the Word, PDF, and Excel exports — so adding/renaming a type or medium only
    /// needs to happen here instead of in each export generator separately.</summary>
    internal static class RecordLabels
    {
        private static readonly Dictionary<string, string> TypeLabelsAr = new()
        {
            ["Files"] = "ملفات",
            ["Registers"] = "سجلات",
            ["Maps"] = "خرائط",
            ["Engineering Designs"] = "تصاميم هندسية",
            ["Photos"] = "صور",
            ["Booklets"] = "كراسات",
            ["Books"] = "كتب",
        };

        private static readonly Dictionary<string, string> MediumLabelsAr = new()
        {
            ["Paper"] = "وسائط ورقية",
            ["Electronic"] = "وسائط إلكترونية",
            ["Audio-Visual"] = "وسائط سمعية وبصرية",
        };

        public static string TypeLabel(string? v) => v is null ? "—" : TypeLabelsAr.GetValueOrDefault(v, v);
        public static string MediumLabel(string? v) => v is null ? "—" : MediumLabelsAr.GetValueOrDefault(v, v);
        public static string YearOnly(DateTime? d) => d?.Year.ToString() ?? "/";

        /// <summary>Department is stored as "Unit - Section" (e.g. "المدارس - مدرسة الإمام"), or just the
        /// unit alone when no section applies. The Word/PDF header shows the more specific piece — the
        /// section — falling back to the unit name when the request has no section.</summary>
        public static string SectionOrDepartment(string? department)
        {
            if (string.IsNullOrWhiteSpace(department)) return department ?? "";
            var parts = department.Split(" - ");
            var unit = parts[0];
            var section = parts.Length > 1 ? string.Join(" - ", parts.Skip(1)) : "";
            return string.IsNullOrEmpty(section) ? unit : section;
        }

        private const string SchoolsUnitName = "المدارس";
        private const string SchoolsRealDepartmentName = "إدارة تقييم الطلبة";

        /// <summary>Schools pick the general "المدارس" unit on the site for simplicity — the actual
        /// ministry department a report should name is "إدارة تقييم الطلبة". Used only by the Excel
        /// export's "الإدارة" column, which — unlike Word/PDF — always shows the unit, never the section.</summary>
        public static string ExcelDepartmentName(string unit) =>
            unit == SchoolsUnitName ? SchoolsRealDepartmentName : unit;

        /// <summary>Shows a volume value as entered (up to 4 decimal places, no forced trailing-zero
        /// padding) instead of always rounding/padding to a fixed 2 decimals, which used to silently
        /// drop precision a user actually typed in (e.g. 0.4318 becoming "0.43").</summary>
        public static string VolumeText(decimal? v) => v?.ToString("0.####") ?? "—";
    }
}
