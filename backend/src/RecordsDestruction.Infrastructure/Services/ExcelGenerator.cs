using ClosedXML.Excel;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services
{
    internal static class ExcelGenerator
    {
        public static byte[] ExportDestructionSummary(
            List<DestructionRequest> requests,
            string concernedParty = "وزارة التربية والتعليم والتعليم العالي",
            string recordsUnit    = "المكتب الفني")
        {
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("كشف بيانات");
            ws.RightToLeft = true;

            var maroon  = XLColor.FromHtml("#8B1737");
            var maroon2 = XLColor.FromHtml("#8A1538");
            var grey    = XLColor.FromHtml("#D9D9D9");
            var white   = XLColor.White;
            var black   = XLColor.Black;
            var dashed  = XLBorderStyleValues.Dashed;
            var thin    = XLBorderStyleValues.Thin;

            // ── Column widths (match original pixel widths) ──
            ws.Column("A").Width = 17.6;
            ws.Column("B").Width = 34.2;   // رقم الإتلاف
            ws.Column("C").Width = 71.5;   // الإدارة
            ws.Column("D").Width = 58.6;   // القسم
            ws.Column("E").Width = 25.0;   // العدد التسلسلي
            ws.Column("F").Width = 117.5;  // عنوان الوثائق
            ws.Column("G").Width = 19.1;   // أصل
            ws.Column("H").Width = 16.5;   // صورة
            ws.Column("I").Width = 45.5;   // نوع الوثائق
            ws.Column("J").Width = 45.5;   // وسائط الحفظ
            ws.Column("K").Width = 45.5;   // رقم قاعدة الحفظ
            ws.Column("L").Width = 21.9;   // التاريخ الأدنى
            ws.Column("M").Width = 21.9;   // التاريخ الأقصى (fixed from original missing)
            ws.Column("N").Width = 34.5;   // حجم الوثائق
            ws.Column("O").Width = 73.5;   // ملاحظات
            ws.Column("P").Width = 91.1;   // توصيات
            ws.Column("Q").Width = 81.0;   // قرار اللجنة

            // ── Logo (top-right corner, col Q-R row 2) ──
            var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "pdf.png");
            if (!File.Exists(logoPath))
            {
                var altPaths = new[] {
                    "/app/wwwroot/images/pdf.png",
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "pdf.png")
                };
                foreach (var alt in altPaths)
                    if (File.Exists(alt)) { logoPath = alt; break; }
            }
            if (File.Exists(logoPath))
            {
                try
                {
                    ws.AddPicture(logoPath)
                      .MoveTo(ws.Cell("R2"))
                      .WithSize(120, 120);
                }
                catch { }
            }

            // ── Row 2: Title ──
            ws.Row(2).Height = 147;
            ws.Range("I2:M2").Merge();
            ws.Range("N2:Q2").Merge();

            var titleAr = ws.Cell("I2");
            titleAr.Value = "كشـف بـيـانــات استـمارات طـلب إتــلاف وثـائــق";
            titleAr.Style.Font.Bold = true;
            titleAr.Style.Font.FontSize = 30;
            titleAr.Style.Font.FontColor = maroon;
            titleAr.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleAr.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            titleAr.Style.Alignment.WrapText   = true;

            var titleEn = ws.Cell("N2");
            titleEn.Value = "Records Destruction Forms Request Summary";
            titleEn.Style.Font.Bold = true;
            titleEn.Style.Font.FontSize = 30;
            titleEn.Style.Font.FontColor = maroon;
            titleEn.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleEn.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            titleEn.Style.Alignment.WrapText   = true;

            // ── Row 3: spacer ──
            ws.Row(3).Height = 40.25;

            // ── Row 4: Concerned Party ──
            ws.Row(4).Height = 105.65;
            ws.Range("B4:E4").Merge();
            ws.Range("F4:O4").Merge();
            ws.Range("P4:Q4").Merge();

            StyleLabelCell(ws.Cell("B4"), "الجهة المعنية:", maroon, white);
            StyleValueCell(ws.Cell("F4"), concernedParty);
            StyleLabelCell(ws.Cell("P4"), "Concerned Party:", maroon, white);

            // ── Row 5: Records Management Unit ──
            ws.Row(5).Height = 105.65;
            ws.Range("B5:E5").Merge();
            ws.Range("F5:O5").Merge();
            ws.Range("P5:Q5").Merge();

            StyleLabelCell(ws.Cell("B5"), "الإدارة المختصة:", maroon, white);
            StyleValueCell(ws.Cell("F5"), recordsUnit);
            StyleLabelCell(ws.Cell("P5"), "Records Management Unit:", maroon, white);

            // ── Row 6: spacer ──
            ws.Row(6).Height = 33;

            // ── Row 7: Note AR ──
            ws.Row(7).Height = 26.5;
            ws.Range("B7:O7").Merge();
            ws.Range("P7:Q7").Merge();

            var n7ar = ws.Cell("B7");
            n7ar.Value = "يتم ملء هذا النموذج من قبل الإدارة المختصة في الجهة المعنية";
            n7ar.Style.Font.Bold = true;
            n7ar.Style.Font.FontColor = maroon;
            n7ar.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            n7ar.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            n7ar.Style.Border.BottomBorder = dashed;
            n7ar.Style.Border.BottomBorderColor = XLColor.FromHtml("#AAAAAA");

            var n7en = ws.Cell("P7");
            n7en.Value = "يتم ملء هذا النموذج من قبل دار الوثائق القطرية ولجنة إتلاف الوثائق والمحفوظات";
            n7en.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            n7en.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            n7en.Style.Alignment.WrapText   = true;
            n7en.Style.Border.BottomBorder  = dashed;
            n7en.Style.Border.BottomBorderColor = XLColor.FromHtml("#AAAAAA");

            // ── Row 8: Note EN ──
            ws.Row(8).Height = 35;
            ws.Range("B8:O8").Merge();
            ws.Range("P8:Q8").Merge();

            var n8ar = ws.Cell("B8");
            n8ar.Value = "This form will be filled out by the Records Management Unit in the Concerned Party";
            n8ar.Style.Font.FontColor = maroon;
            n8ar.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
            n8ar.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;

            var n8en = ws.Cell("P8");
            n8en.Value = "This form will be filled out by NAQ and Records & Archives Destruction Committee";
            n8en.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
            n8en.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            n8en.Style.Alignment.WrapText   = true;

            // ── Row 9: spacer ──
            ws.Row(9).Height = 19;

            // ── Row 10: Column headers ──
            ws.Row(10).Height = 142.5;

            var headers = new[]
            {
                ("B",  "رقم الإتلاف\n.Destruction No",                                                                  maroon2, white,  true),
                ("C",  "الإدارة\nRecords Creator Unit",                                                                   maroon2, white,  true),
                ("D",  "القسم\nRecords Creator Section",                                                                  maroon2, white,  true),
                ("E",  "العدد التسلسلي\nNo.",                                                                             maroon2, white,  true),
                ("F",  "عنوان / محتوى الوثائـق\nRecords Title /Description",                                             maroon2, white,  true),
                ("G",  "أصل\nOriginal",                                                                                   maroon2, white,  true),
                ("H",  "صورة\nCopy",                                                                                      maroon2, white,  true),
                ("I",  "نوع الوثائق\nRecords Type\n(ملفات، سجلات/دفاتر، خرائط، تصاميم هندسية، صور فوتوغرافية، أخرى)", maroon2, white,  true),
                ("J",  "وسائط حفظ الوثائق\nRecords Storage Medium\n(وسائط ورقية، وسائط إلكترونية، وسائط سمعية وبصرية، أخرى)", maroon2, white, true),
                ("K",  "رقم قاعدة الحفظ بجداول مدد استبقاء الوثائق\nRecords Retention Rule No. in R.R.D.S",             maroon2, white,  true),
                ("L",  "التاريخ الأدنى\nFirst Date",                                                                     maroon2, white,  true),
                ("M",  "التاريخ الأقصى\nLast Date",                                                                      maroon2, white,  true),
                ("N",  "حجم الوثائق\n(المتر الطولي)\nRecords Volume\n(in linear meter)",                                 maroon2, white,  true),
                ("O",  "ملاحظات\nRemarks",                                                                                maroon2, white,  true),
                ("P",  "توصيات إدارة التدريب والتوجيه المؤسسي\nTraining & Corporate Guidance Department Recommendations", grey,   black,  true),
                ("Q",  "قرار لجنة إتلاف الوثائق والمحفوظات\nRecords & Archives Destruction Committee Decision",          grey,   black,  true),
            };

            foreach (var (col, text, bg, fg, wrap) in headers)
            {
                var cell = ws.Cell($"{col}10");
                cell.Value = text;
                cell.Style.Font.Bold      = true;
                cell.Style.Font.FontSize  = 18;
                cell.Style.Font.FontColor = fg;
                cell.Style.Fill.BackgroundColor = bg;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
                cell.Style.Alignment.WrapText   = wrap;
                cell.Style.Border.OutsideBorder = thin;
                cell.Style.Border.OutsideBorderColor = white;
            }

            // ── Data rows ──
            int excelRow = 11;
            int serialNo = 1;

            foreach (var req in requests.OrderBy(r => r.DestructionNo))
            {
                var deptParts  = req.Department?.Split(" - ") ?? Array.Empty<string>();
                string adminUnit = deptParts.Length > 0 ? deptParts[0] : (req.Department ?? "");
                string section   = deptParts.Length > 1 ? string.Join(" - ", deptParts.Skip(1)) : "";

                foreach (var rec in req.Records.OrderBy(r => r.SerialNo))
                {
                    ws.Row(excelRow).Height = 53.4;
                    var rowBg = excelRow % 2 == 0 ? XLColor.FromHtml("#FDF8F8") : white;

                    void D(string col, string? val)
                    {
                        var cell = ws.Cell($"{col}{excelRow}");
                        cell.Value = val ?? "—";
                        cell.Style.Fill.BackgroundColor = rowBg;
                        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                        cell.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
                        cell.Style.Alignment.WrapText   = true;
                        cell.Style.Border.OutsideBorder = thin;
                        cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CCCCCC");
                        cell.Style.Font.FontSize = 14;
                    }

                    void DRight(string col, string? val)
                    {
                        D(col, val);
                        ws.Cell($"{col}{excelRow}").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    }

                    D("B", req.DestructionNo ?? "—");
                    DRight("C", adminUnit);
                    DRight("D", section);
                    D("E", serialNo.ToString());
                    DRight("F", rec.RecordsTitle ?? "—");
                    D("G", rec.OriginalOrCopy == "Original" || rec.OriginalOrCopy == "أصل" ? "✓" : "");
                    D("H", rec.OriginalOrCopy == "Copy"     || rec.OriginalOrCopy == "صورة" ? "✓" : "");
                    DRight("I", rec.RecordsType    ?? "—");
                    DRight("J", rec.StorageMedium  ?? "—");
                    D("K", rec.RetentionRuleNo    ?? "/");
                    D("L", rec.FirstDate?.ToString("dd/MM/yyyy") ?? "—");
                    D("M", rec.LastDate?.ToString("dd/MM/yyyy")  ?? "—");
                    D("N", rec.RecordsVolume?.ToString("0.00")   ?? "—");
                    DRight("O", rec.Remarks ?? "—");
                    D("P", "");
                    D("Q", "");

                    serialNo++;
                    excelRow++;
                }
            }

            // ── Border around entire data area ──
            if (excelRow > 11)
            {
                ws.Range(10, 2, excelRow - 1, 17)
                  .Style.Border.OutsideBorder = XLBorderStyleValues.Medium;
                ws.Range(10, 2, excelRow - 1, 17)
                  .Style.Border.OutsideBorderColor = maroon2;
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        private static void StyleLabelCell(IXLCell cell, string text, XLColor bg, XLColor fg)
        {
            cell.Value = text;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 22;
            cell.Style.Font.FontColor = fg;
            cell.Style.Fill.BackgroundColor = bg;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            cell.Style.Alignment.WrapText   = true;
        }

        private static void StyleValueCell(IXLCell cell, string text)
        {
            cell.Value = text;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 22;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;
            cell.Style.Alignment.WrapText   = true;
        }
    }
}
