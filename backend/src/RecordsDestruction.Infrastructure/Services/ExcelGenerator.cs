using ClosedXML.Excel;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services
{
    /// <summary>Fills the official National Archives of Qatar "كشف بيانات استمارات طلب إتلاف وثائق" template
    /// (Templates/destruction-summary-template.xlsx) instead of building a lookalike from scratch.</summary>
    internal static class ExcelGenerator
    {
        private const int FirstDataRow = 11;
        private const int LastPreStyledRow = 26; // rows 11..26 already exist with the template's own styling

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

        private static string TypeLabel(string? v) => v is null ? "—" : TypeLabelsAr.GetValueOrDefault(v, v);
        private static string MediumLabel(string? v) => v is null ? "—" : MediumLabelsAr.GetValueOrDefault(v, v);
        private static string YearOnly(DateTime? d) => d?.Year.ToString() ?? "—";

        private const double TemplateFontSize = 18;
        private const double RemarksFontSize = 22; // bigger than the template default — Remarks reads too small otherwise

        /// <summary>Rough estimate of wrapped-line count for a column, so long "Remarks"/"Title" text
        /// gets a taller row instead of overflowing into the row below it. Accounts for font size,
        /// since a bigger font fits fewer characters per line.</summary>
        private static double EstimateRowHeight(string? text, double colWidthUnits, double baseHeight, double fontSize = TemplateFontSize)
        {
            if (string.IsNullOrEmpty(text)) return baseHeight;
            const double charsPerWidthUnitAt18pt = 0.9; // conservative: under-count chars/line rather than over
            double charsPerWidthUnit = charsPerWidthUnitAt18pt * (TemplateFontSize / fontSize);
            double lineHeight = 22 * (fontSize / TemplateFontSize);
            double charsPerLine = Math.Max(colWidthUnits * charsPerWidthUnit, 10);
            int lines = Math.Max(1, (int)Math.Ceiling(text.Length / charsPerLine));
            return Math.Max(baseHeight, lines * lineHeight);
        }

        public static byte[] ExportDestructionSummary(
            List<DestructionRequest> requests,
            string concernedParty = "وزارة التربية والتعليم والتعليم العالي",
            string recordsUnit    = "المكتب الفني")
        {
            using var wb = new XLWorkbook(TemplatePaths.Resolve("destruction-summary-template.xlsx"));
            var ws = wb.Worksheets.First();

            // The template embeds its logo as a modern "image in cell" rich value (B2), which ClosedXML
            // does not round-trip. Clear the placeholder and re-embed the same logo as a normal picture.
            ws.Cell("B2").Clear();
            try
            {
                ws.AddPicture(TemplatePaths.Resolve("naq-logo.jpeg"))
                  .MoveTo(ws.Cell("B2"))
                  .WithSize(230, 90);
            }
            catch { }

            ws.Cell("F4").Value = concernedParty;
            ws.Cell("F5").Value = recordsUnit;

            int currentRow = FirstDataRow;
            int serialNo = 1;
            const double dataRowHeight = 280;
            double titleColWidth = ws.Column("F").Width;
            double remarksColWidth = ws.Column("O").Width;

            var rows = requests.OrderBy(r => r.DestructionNo)
                .SelectMany(req => req.Records.OrderBy(rec => rec.SerialNo).Select(rec => (req, rec)));

            foreach (var (req, rec) in rows)
            {
                if (currentRow > LastPreStyledRow)
                {
                    ws.Row(currentRow - 1).InsertRowsBelow(1);
                    CopyRowStyle(ws, currentRow - 1, currentRow);
                }

                var deptParts = req.Department?.Split(" - ") ?? Array.Empty<string>();
                string adminUnit = deptParts.Length > 0 ? deptParts[0] : (req.Department ?? "");
                string section   = deptParts.Length > 1 ? string.Join(" - ", deptParts.Skip(1)) : "";

                ws.Cell($"B{currentRow}").Value = req.DestructionNo ?? "—";
                ws.Cell($"C{currentRow}").Value = adminUnit;
                ws.Cell($"D{currentRow}").Value = section;
                ws.Cell($"E{currentRow}").Value = serialNo;
                ws.Cell($"F{currentRow}").Value = rec.RecordsTitle ?? "—";
                ws.Cell($"G{currentRow}").Value = (rec.OriginalOrCopy == "Original" || rec.OriginalOrCopy == "أصل") ? "✓" : "";
                ws.Cell($"H{currentRow}").Value = (rec.OriginalOrCopy == "Copy"     || rec.OriginalOrCopy == "صورة") ? "✓" : "";
                ws.Cell($"I{currentRow}").Value = TypeLabel(rec.RecordsType);
                ws.Cell($"J{currentRow}").Value = MediumLabel(rec.StorageMedium);
                ws.Cell($"K{currentRow}").Value = rec.RetentionRuleNo ?? "/";
                ws.Cell($"L{currentRow}").Value = YearOnly(rec.FirstDate);
                ws.Cell($"M{currentRow}").Value = YearOnly(rec.LastDate);
                ws.Cell($"N{currentRow}").Value = rec.RecordsVolume?.ToString("0.00")   ?? "—";
                var remarksCell = ws.Cell($"O{currentRow}");
                remarksCell.Value = rec.Remarks ?? "—";
                remarksCell.Style.Font.FontSize = RemarksFontSize;
                // P (توصيات إدارة التدريب) and Q (قرار لجنة الإتلاف) are left blank —
                // they are filled in by NAQ / the destruction committee after the fact, not by this system.

                double neededHeight = Math.Max(
                    EstimateRowHeight(rec.RecordsTitle, titleColWidth, dataRowHeight),
                    EstimateRowHeight(rec.Remarks, remarksColWidth, dataRowHeight, RemarksFontSize));
                ws.Row(currentRow).Height = neededHeight;

                serialNo++;
                currentRow++;
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        private static void CopyRowStyle(IXLWorksheet ws, int fromRow, int toRow)
        {
            for (int col = 2; col <= 17; col++) // columns B..Q
                ws.Cell(toRow, col).Style = ws.Cell(fromRow, col).Style;
            ws.Row(toRow).Height = ws.Row(fromRow).Height;
        }
    }
}
