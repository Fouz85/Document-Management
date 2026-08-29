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

        private const double DataFontSize = 28; // applied to every data cell — the template's own 18pt reads too small once real data fills the sheet
        private const double ColumnWidthScale = 1.4; // widen every data column to match the bigger font above

        public static byte[] ExportDestructionSummary(
            List<DestructionRequest> requests,
            string concernedParty = "وزارة التربية والتعليم والتعليم العالي",
            string recordsUnit    = "المكتب الفني")
        {
            using var wb = new XLWorkbook(TemplatePaths.Resolve("destruction-summary-template.xlsx"));
            var ws = wb.Worksheets.First();

            // The template embeds its logo as a modern "image in cell" rich value (B2), which ClosedXML
            // does not round-trip. Clear the placeholder and re-embed the same logo as a normal picture,
            // scaled up from the template's original 230x90 while keeping its aspect ratio.
            ws.Cell("B2").Clear();
            try
            {
                ws.AddPicture(TemplatePaths.Resolve("naq-logo.jpeg"))
                  .MoveTo(ws.Cell("B2"))
                  .WithSize(600, 235);
            }
            catch { }

            // The template writes these value cells at 18pt against a 28pt label ("الجهة المعنية:" /
            // "الإدارة المختصة:") right next to them — match the label's size instead.
            ws.Cell("F4").Value = concernedParty;
            ws.Cell("F4").Style.Font.FontSize = 28;
            ws.Cell("F5").Value = recordsUnit;
            ws.Cell("F5").Style.Font.FontSize = 28;

            // Widen every data column to match the bigger font (DataFontSize) applied to each cell below.
            foreach (char col in new[] { 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O' })
                ws.Column(col.ToString()).Width *= ColumnWidthScale;

            int currentRow = FirstDataRow;
            int serialNo = 1;
            const double dataRowHeight = 280; // floor so a short entry doesn't shrink below the template's own row height

            var rows = requests.OrderBy(r => r.DestructionNo)
                .SelectMany(req => req.Records.OrderBy(rec => rec.SerialNo).Select(rec => (req, rec)))
                .ToList();

            // Insert every extra row the export needs in one bulk operation instead of one row at a
            // time in the loop below — ClosedXML has to shift the whole sheet on each InsertRowsBelow
            // call, so doing it per-row made large exports O(n^2) instead of O(n).
            int availablePreStyledRows = LastPreStyledRow - FirstDataRow + 1;
            int extraRowsNeeded = rows.Count - availablePreStyledRows;
            if (extraRowsNeeded > 0)
            {
                ws.Row(LastPreStyledRow).InsertRowsBelow(extraRowsNeeded);
                for (int i = 1; i <= extraRowsNeeded; i++)
                    CopyRowStyle(ws, LastPreStyledRow, LastPreStyledRow + i);
            }

            foreach (var (req, rec) in rows)
            {
                var deptParts = req.Department?.Split(" - ") ?? Array.Empty<string>();
                string adminUnit = deptParts.Length > 0 ? deptParts[0] : (req.Department ?? "");
                string section   = deptParts.Length > 1 ? string.Join(" - ", deptParts.Skip(1)) : "";

                ws.Cell($"B{currentRow}").Value = req.DestructionNo ?? "—";
                ws.Cell($"C{currentRow}").Value = RecordLabels.ExcelDepartmentName(adminUnit);
                ws.Cell($"D{currentRow}").Value = section;
                ws.Cell($"E{currentRow}").Value = serialNo;
                ws.Cell($"F{currentRow}").Value = rec.RecordsTitle ?? "—";
                ws.Cell($"G{currentRow}").Value = (rec.OriginalOrCopy == "Original" || rec.OriginalOrCopy == "أصل") ? "✓" : "";
                ws.Cell($"H{currentRow}").Value = (rec.OriginalOrCopy == "Copy"     || rec.OriginalOrCopy == "صورة") ? "✓" : "";
                ws.Cell($"I{currentRow}").Value = RecordLabels.TypeLabel(rec.RecordsType);
                ws.Cell($"J{currentRow}").Value = RecordLabels.MediumLabel(rec.StorageMedium);
                ws.Cell($"K{currentRow}").Value = rec.RetentionRuleNo ?? "/";
                ws.Cell($"L{currentRow}").Value = RecordLabels.YearOnly(rec.FirstDate);
                ws.Cell($"M{currentRow}").Value = RecordLabels.YearOnly(rec.LastDate);
                ws.Cell($"N{currentRow}").Value = RecordLabels.VolumeText(rec.RecordsVolume);
                var remarksCell = ws.Cell($"O{currentRow}");
                remarksCell.Value = rec.Remarks ?? "";

                // Every data cell gets bumped up to DataFontSize — the template's own 18pt reads too
                // small once real data fills the sheet — and the short, single-value columns (serial
                // no., checkmarks, retention rule, dates, volume, destruction no.) are centered; the
                // free-text columns (title, unit/section names, remarks) keep the template's own alignment.
                var centeredCols = new HashSet<char> { 'B', 'E', 'G', 'H', 'K', 'L', 'M', 'N' };
                foreach (char col in new[] { 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O' })
                {
                    var cell = ws.Cell($"{col}{currentRow}");
                    cell.Style.Font.FontSize = DataFontSize;
                    if (centeredCols.Contains(col))
                    {
                        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    }
                }
                // The template's cells read right-to-left, which reverses a "YYYY\NN" value like "2026\03"
                // into "03\2026" — force left-to-right just for this cell so the digits stay in order.
                ws.Cell($"B{currentRow}").Style.Alignment.ReadingOrder = XLAlignmentReadingOrderValues.LeftToRight;
                // P (توصيات إدارة التدريب) and Q (قرار لجنة الإتلاف) are left blank —
                // they are filled in by NAQ / the destruction committee after the fact, not by this system.

                // Measures the row's actual rendered content (respecting the column widths and wrap
                // settings above) instead of guessing a line count from character totals — the earlier
                // char-based estimate under-counted wrapped lines for some titles and clipped them.
                ws.Row(currentRow).AdjustToContents();
                if (ws.Row(currentRow).Height < dataRowHeight) ws.Row(currentRow).Height = dataRowHeight;

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
