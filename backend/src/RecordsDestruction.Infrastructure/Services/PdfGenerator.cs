using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RecordsDestruction.Domain.Entities;
using SkiaSharp;

namespace RecordsDestruction.Infrastructure.Services
{
    internal static class PdfGenerator
    {
        // Applied to every actual data value (not the static labels/headers around it) — bigger than
        // the page's 9pt default so the whole document, not just the records table, stays legible,
        // including multi-line entries (e.g. several schools listed one per line).
        private const float DocFontSize = 14f;

        private static bool _fontRegistered = false;

        public static byte[] GenerateDestructionRequestPdf(
            DestructionRequest r,
            string? logoPath,
            string? calligraphyPath,
            string generatedBy = "System",
            string? approvedBy = null)
        {
            QuestPDF.Settings.CheckIfAllTextGlyphsAreAvailable = false;

            if (!_fontRegistered)
            {
                try
                {
                    foreach (var fileName in new[] { "Lusail-Regular.otf", "Lusail-Bold.otf" })
                    {
                        var fontPaths = new[]
                        {
                            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "fonts", fileName),
                            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "fonts", fileName),
                            $"/app/wwwroot/fonts/{fileName}",
                        };
                        foreach (var fp in fontPaths)
                        {
                            if (File.Exists(fp))
                            {
                                using var fs = File.OpenRead(fp);
                                QuestPDF.Drawing.FontManager.RegisterFont(fs);
                                break;
                            }
                        }
                    }
                    _fontRegistered = true;
                }
                catch { }
            }

            var logoBytes     = LoadImageBytes(logoPath);
            var calliBytes    = LoadImageBytes(calligraphyPath);
            var ministryRaw   = LoadImageBytes(
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "Ministrylogo.png"));
            var ministryBytes = RemoveWhiteBackground(ministryRaw);

            string destructionNo = r.DestructionNo ?? $"#{r.Id}";

            return Document.Create(container =>
            {
                // ── PAGE 1: Form info ──
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(10);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Lusail"));

                    page.Content().Column(col =>
                    {
                        col.Item().Element(c => BuildHeader(c, r, logoBytes, calliBytes, ministryBytes, approvedBy));
                        col.Item().PaddingTop(4).Element(c => BuildFormContent(c, r));
                    });

                    page.Footer().Element(c => BuildFooter(c, calliBytes, destructionNo));
                });

                // ── PAGE 2: Records table ──
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(10);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Lusail"));

                    page.Content().Column(col =>
                    {
                        col.Item().Element(c => BuildHeader(c, r, logoBytes, calliBytes, ministryBytes, approvedBy));
                        col.Item().PaddingTop(6).Element(c => BuildRecordsTable(c, r));
                    });

                    page.Footer().Element(c => BuildFooter(c, calliBytes, destructionNo));
                });

                // ── PAGE 3: Signatures ──
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(10);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Lusail"));

                    page.Content().Column(col =>
                    {
                        col.Item().Element(c => BuildHeader(c, r, logoBytes, calliBytes, ministryBytes, approvedBy));
                        col.Item().PaddingTop(6).Element(c => BuildSignatures(c, r));
                    });

                    page.Footer().Element(c => BuildFooter(c, calliBytes, destructionNo));
                });

            }).GeneratePdf();
        }

        // ──────────────────────────────────────────────────────────────────
        private static byte[]? LoadImageBytes(string? path)
        {
            try
            {
                if (string.IsNullOrEmpty(path)) return null;
                if (File.Exists(path)) return File.ReadAllBytes(path);
                var alts = new[]
                {
                    path,
                    Path.Combine("/app",                                path.TrimStart('/')),
                    Path.Combine(Directory.GetCurrentDirectory(),       path.TrimStart('/')),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, path.TrimStart('/'))
                };
                foreach (var a in alts) if (File.Exists(a)) return File.ReadAllBytes(a);
                return null;
            }
            catch { return null; }
        }

        private static byte[]? RemoveWhiteBackground(byte[]? imageBytes, int threshold = 240)
        {
            if (imageBytes == null) return null;
            try
            {
                using var ms = new MemoryStream(imageBytes);
                var bitmap = SKBitmap.Decode(ms);
                if (bitmap == null) return imageBytes;
                for (int y = 0; y < bitmap.Height; y++)
                    for (int x = 0; x < bitmap.Width; x++)
                    {
                        var pixel = bitmap.GetPixel(x, y);
                        bool isWhite = pixel.Red >= threshold && pixel.Green >= threshold && pixel.Blue >= threshold;
                        bool isBlack = pixel.Red <= 15 && pixel.Green <= 15 && pixel.Blue <= 15;
                        if (isWhite || isBlack)
                            bitmap.SetPixel(x, y, SKColors.Transparent);
                    }
                using var outMs = new MemoryStream();
                bitmap.Encode(outMs, SKEncodedImageFormat.Png, 100);
                return outMs.ToArray();
            }
            catch { return imageBytes; }
        }

        // ══════════════════════════════════════════════════════════════════
        // HEADER
        // ══════════════════════════════════════════════════════════════════
        private static void BuildHeader(IContainer c, DestructionRequest r,
            byte[]? logo, byte[]? calli, byte[]? ministry, string? approvedBy)
        {
            c.Column(main =>
            {
                main.Item().Border(1).BorderColor("#8A1538").Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(130);
                        cols.RelativeColumn();
                        cols.ConstantColumn(130);
                    });

                    table.Cell().Background("#8A1538").AlignCenter().AlignMiddle().Column(col =>
                    {
                        if (logo != null)
                            col.Item().Background("#8A1538").Padding(8).Image(logo).FitArea();
                        else
                            col.Item().Text("NAQ").FontSize(16).Bold().FontColor(Colors.White);
                    });

                    table.Cell().Padding(10).AlignCenter().AlignMiddle().Column(col =>
                    {
                        col.Item().Text("Records Destruction Form | استمارة إتلاف وثائق")
                            .Bold().FontSize(12).FontColor("#8A1538");
                        col.Item().PaddingTop(4).Row(row =>
                        {
                            row.AutoItem()
                                .Text($"{r.SubmittedAt:dd/MM/yyyy} | Submission #{r.Id}")
                                .FontSize(9).FontColor("#333333");
                            if (r.Status == "Approved" && !string.IsNullOrEmpty(approvedBy))
                                row.AutoItem()
                                    .Text($" | Approved by: {approvedBy}")
                                    .FontSize(9).FontColor("#129b82").Bold();
                        });
                    });

                    table.Cell().Background("#8A1538").AlignCenter().AlignMiddle().Column(col =>
                    {
                        if (ministry != null)
                            col.Item().Background("#8A1538").Padding(8).Image(ministry).FitArea();
                        else if (calli != null)
                            col.Item().MaxHeight(40).Image(calli).FitArea();
                    });
                });
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // PAGE 1 — Form info
        // ══════════════════════════════════════════════════════════════════
        private static void BuildFormContent(IContainer c, DestructionRequest r)
        {
            c.Column(col =>
            {
                col.Spacing(3);
                col.Item().MaxHeight(2).Background("#A29475");

                col.Item().Border(1).BorderColor("#dddddd").Table(t =>
                {
                    t.ColumnsDefinition(x =>
                    {
                        x.RelativeColumn(1.4f); x.RelativeColumn(2.5f); x.RelativeColumn(1.4f);
                    });
                    BilingualRow(t, "Concerned Party:", r.ConcernedParty, ":الجهة المعنية");
                    BilingualRow(t, "Destruction No.:", r.DestructionNo ?? "—", ":إتلاف رقم", valueIsLtr: true);
                });

                var leftHandBytes  = RemoveWhiteBackground(LoadImageBytes(
                    Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "lefthand.png")));
                var rightHandBytes = RemoveWhiteBackground(LoadImageBytes(
                    Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "righthand.png")));

                col.Item().Border(1).BorderColor("#dddddd").Padding(5).Row(nr =>
                {
                    nr.AutoItem().AlignMiddle().Width(22).Height(22).Element(e =>
                    {
                        if (leftHandBytes != null) e.Image(leftHandBytes).FitArea();
                        else e.Text("☝🏻").FontSize(14);
                    });
                    nr.ConstantItem(6);
                    nr.RelativeItem().AlignLeft().AlignMiddle()
                        .Text("To be filled out by the Records Management Unit")
                        .FontSize(8).Italic();
                    nr.RelativeItem().AlignRight().AlignMiddle()
                        .Text("تتم تعبئتها من قِبل الإدارة المختصة")
                        .FontSize(8).Italic().DirectionFromRightToLeft();
                    nr.ConstantItem(6);
                    nr.AutoItem().AlignMiddle().Width(22).Height(22).Element(e =>
                    {
                        if (rightHandBytes != null) e.Image(rightHandBytes).FitArea();
                        else e.Text("☝🏻").FontSize(14);
                    });
                });

                SectionHeader(col, "Data of Records Creator Unit",
                                   "بيانات الوحدة الإدارية المُنشئة للوثائق");
                col.Item().Border(1).BorderColor("#dddddd").Table(t =>
                {
                    t.ColumnsDefinition(x =>
                    {
                        x.RelativeColumn(1.4f); x.RelativeColumn(2.5f); x.RelativeColumn(1.4f);
                    });
                    BilingualRow(t, "Records Creator Unit / Section:", RecordLabels.SectionOrDepartment(r.Department), ":الإدارة / القسم");
                    BilingualRow(t, "Responsible Officer:",             r.ResponsibleOfficer,  ":الموظف المسؤول");
                    BilingualRow(t, "Email address:",                   r.Email,               ":البريد الإلكتروني");
                    BilingualRow(t, "Tel.:",                            r.Phone,               ":الهاتف");
                });

                SectionHeader(col, "Data of Records Prepared for Destruction",
                                   "بيانات الوثائق المُعدَّة للإتلاف");
                col.Item().Border(1).BorderColor("#dddddd").Table(t =>
                {
                    t.ColumnsDefinition(x =>
                    {
                        x.RelativeColumn(1.4f); x.RelativeColumn(2.5f); x.RelativeColumn(1.4f);
                    });
                    BilingualRow(t, "Records Storage Location Address:", r.StorageLocation,
                                    ":عنوان مكان حفظ الوثائق");
                    BilingualRow(t, "Total Volume (linear meter):",
                                    RecordLabels.VolumeText(r.TotalVolume) + " m",
                                    ":(الحجم الإجمالي (متر طولي");
                    BilingualRow(t, "Records First Date:",
                                    RecordLabels.YearOnly(r.RecordsFirstDate),
                                    ":التاريخ الأدنى");
                    BilingualRow(t, "Records Last Date:",
                                    RecordLabels.YearOnly(r.RecordsLastDate),
                                    ":التاريخ الأقصى");
                });
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // PAGE 2 — Records table
        // ══════════════════════════════════════════════════════════════════
        private static void BuildRecordsTable(IContainer c, DestructionRequest r)
        {
            c.Column(col =>
            {
                col.Item().Background("#8A1538").Table(t =>
                {
                    t.ColumnsDefinition(x => { x.RelativeColumn(); x.RelativeColumn(); });
                    t.Cell().BorderLeft(4).BorderColor("#A29475").Padding(5).AlignLeft().AlignMiddle()
                        .Text($"List Of Records Prepared for Destruction ({r.Records.Count})")
                        .FontColor(Colors.White).FontSize(8f).Bold();
                    t.Cell().Padding(5).AlignRight().AlignMiddle()
                        .Text($"({r.Records.Count}) قائمة الوثائق المُعدَّة للإتلاف")
                        .FontColor(Colors.White).FontSize(8f).Bold()
                        .DirectionFromRightToLeft();
                });

                col.Item().PaddingTop(4).Table(t =>
                {
                    t.ColumnsDefinition(x =>
                    {
                        x.RelativeColumn(1.5f); x.ConstantColumn(42);  x.ConstantColumn(60);
                        x.ConstantColumn(60);   x.ConstantColumn(60);  x.RelativeColumn(1.2f);
                        x.RelativeColumn(1.2f); x.ConstantColumn(55);  x.RelativeColumn(3);
                        x.ConstantColumn(40);
                    });
                    t.Header(h =>
                    {
                        foreach (var hdr in new[]
                        {
                            "ملاحظات\nRemarks",
                            "حجم الوثائق\n(م. طولي)\nVol.(m)",
                            "التاريخ الأقصى\nLast Date",
                            "التاريخ الأدنى\nFirst Date",
                            "رقم قاعدة الحفظ\nRetention Rule\nNo. in R.R.D.S",
                            "وسائط حفظ الوثائق\nRecords Storage\nMedium",
                            "نوع الوثائق\nRecords Type",
                            "أصل | صورة\nOriginal | Copy",
                            "عنوان / محتوى الوثائق\nRecords Title/Description",
                            "المدد التسلسلي\nNo.",
                        })
                            h.Cell().Background("#8A1538").Padding(3).AlignCenter().AlignMiddle()
                              .Text(hdr).FontColor(Colors.White).FontSize(6.5f).Bold();
                    });

                    foreach (var rec in r.Records.OrderBy(x => x.SerialNo))
                    {
                        string bg = rec.SerialNo % 2 == 0 ? "#fdf8f8" : Colors.White;
                        void Cell(string val) =>
                            t.Cell().Background(bg).BorderBottom(1).BorderColor("#eeeeee")
                             .Padding(3).AlignCenter().AlignMiddle().Text(val).FontSize(DocFontSize);

                        t.Cell().Background(bg).BorderBottom(1).BorderColor("#eeeeee")
                         .Padding(3).AlignRight().AlignMiddle()
                         .Text(rec.Remarks ?? "").FontSize(DocFontSize).DirectionFromRightToLeft();
                        Cell(RecordLabels.VolumeText(rec.RecordsVolume));
                        Cell(RecordLabels.YearOnly(rec.LastDate));
                        Cell(RecordLabels.YearOnly(rec.FirstDate));
                        Cell(rec.RetentionRuleNo ?? "—");
                        Cell(RecordLabels.MediumLabel(rec.StorageMedium));
                        Cell(RecordLabels.TypeLabel(rec.RecordsType));
                        Cell(rec.OriginalOrCopy  ?? "—");
                        t.Cell().Background(bg).BorderBottom(1).BorderColor("#eeeeee")
                         .Padding(3).AlignRight().AlignMiddle()
                         .Text(rec.RecordsTitle ?? "—").FontSize(DocFontSize).DirectionFromRightToLeft();
                        Cell(rec.SerialNo.ToString());
                    }
                });
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // PAGE 3 — Signatures
        // ══════════════════════════════════════════════════════════════════
        private static void BuildSignatures(IContainer c, DestructionRequest r)
        {
            c.Column(col =>
            {
                col.Item().Background("#8A1538").Table(t =>
                {
                    t.ColumnsDefinition(x => { x.RelativeColumn(); x.RelativeColumn(); });
                    t.Cell().BorderLeft(4).BorderColor("#A29475").Padding(5).AlignLeft().AlignMiddle()
                        .Text("Signatures | التوقيعات")
                        .FontColor(Colors.White).FontSize(8f).Bold();
                    t.Cell().Padding(5).AlignRight().AlignMiddle()
                        .Text("التوقيعات | Signatures")
                        .FontColor(Colors.White).FontSize(8f).Bold()
                        .DirectionFromRightToLeft();
                });

                col.Item().PaddingTop(8).Row(row =>
                {
                    var sigs = new[]
                    {
                        ("Records Creator Unit\nالوحدة الإدارية المنشئة",
                            r.CreatorUnitName,       r.CreatorUnitDate,       r.CreatorUnitSignature),
                        ("Legal Affairs Unit\nالشؤون القانونية",
                            r.LegalAffairsName,      r.LegalAffairsDate,      r.LegalAffairsSignature),
                        ("Internal Audit Unit\nالتدقيق الداخلي",
                            r.InternalAuditName,     r.InternalAuditDate,     r.InternalAuditSignature),
                        ("Records Management Unit\nإدارة الوثائق",
                            r.RecordsManagementName, r.RecordsManagementDate, r.RecordsManagementSignature),
                    };
                    foreach (var s in sigs)
                    {
                        row.RelativeItem().Border(1).BorderColor("#dddddd").Column(sc =>
                        {
                            sc.Item().Background("#8A1538").BorderBottom(2).BorderColor("#A29475")
                              .Table(th =>
                              {
                                  th.ColumnsDefinition(x => { x.RelativeColumn(); x.RelativeColumn(); });
                                  var parts = s.Item1.Split('\n');
                                  th.Cell().Padding(4).AlignLeft().AlignMiddle()
                                      .Text(parts[0]).FontColor(Colors.White).FontSize(6.5f).Bold();
                                  th.Cell().Padding(4).AlignRight().AlignMiddle()
                                      .Text(parts.Length > 1 ? parts[1] : "")
                                      .FontColor(Colors.White).FontSize(6.5f).Bold()
                                      .DirectionFromRightToLeft();
                              });

                            sc.Item().Padding(4).Column(inner =>
                            {
                                inner.Item().Row(r2 =>
                                {
                                    r2.RelativeItem().Text("Name:").Bold().FontSize(7).FontColor("#8A1538");
                                    r2.RelativeItem().AlignRight()
                                        .Text(":الاسم").Bold().FontSize(7).FontColor("#8A1538")
                                        .DirectionFromRightToLeft();
                                });
                                inner.Item().AlignCenter()
                                    .Text(s.Item2 ?? "...............").FontSize(DocFontSize);
                                inner.Item().PaddingTop(2).Height(1).Background("#A29475");

                                inner.Item().PaddingTop(3).Row(r2 =>
                                {
                                    r2.RelativeItem().Text("Date:").Bold().FontSize(7).FontColor("#8A1538");
                                    r2.RelativeItem().AlignRight()
                                        .Text(":التاريخ").Bold().FontSize(7).FontColor("#8A1538")
                                        .DirectionFromRightToLeft();
                                });
                                inner.Item().AlignCenter()
                                    .Text(s.Item3?.ToString("dd/MM/yyyy") ?? "...............").FontSize(DocFontSize);
                                inner.Item().PaddingTop(2).Height(1).Background("#A29475");

                                inner.Item().PaddingTop(3).Row(r2 =>
                                {
                                    r2.RelativeItem().Text("Signature:").Bold().FontSize(7).FontColor("#8A1538");
                                    r2.RelativeItem().AlignRight()
                                        .Text(":التوقيع").Bold().FontSize(7).FontColor("#8A1538")
                                        .DirectionFromRightToLeft();
                                });
                                if (!string.IsNullOrEmpty(s.Item4) && s.Item4.StartsWith("data:image"))
                                {
                                    try
                                    {
                                        var b = Convert.FromBase64String(s.Item4.Split(',')[1]);
                                        inner.Item().MaxHeight(65).Image(b).FitArea();
                                    }
                                    catch { inner.Item().MinHeight(30).MaxHeight(65).Border(1).BorderColor("#cccccc").Background("#fafafa"); }
                                }
                                else inner.Item().MinHeight(30).MaxHeight(65).Border(1).BorderColor("#cccccc").Background("#fafafa");
                            });
                        });
                    }
                });
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // FOOTER
        // ══════════════════════════════════════════════════════════════════
        private static void BuildFooter(IContainer c, byte[]? calli, string destructionNo)
        {
            c.Background("#8A1538").Height(50).Layers(layers =>
            {
                layers.Layer().AlignRight().AlignMiddle().Padding(4).Column(lc =>
                {
                    if (calli != null)
                        lc.Item().Width(100).Image(calli).FitArea();
                });
                layers.PrimaryLayer().AlignLeft().AlignMiddle().PaddingLeft(16)
                    .Text(destructionNo)
                    .FontColor(Colors.White).FontSize(9).Bold();
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // HELPERS
        // ══════════════════════════════════════════════════════════════════
        private static void SectionHeader(ColumnDescriptor col, string en, string ar)
        {
            col.Item().Background("#8A1538").Table(t =>
            {
                t.ColumnsDefinition(x => { x.RelativeColumn(); x.RelativeColumn(); });
                t.Cell().BorderLeft(4).BorderColor("#A29475").Padding(5)
                    .AlignLeft().AlignMiddle()
                    .Text(en).FontColor(Colors.White).FontSize(8f).Bold();
                t.Cell().Padding(5).AlignRight().AlignMiddle()
                    .Text(ar).FontColor(Colors.White).FontSize(8f).Bold()
                    .DirectionFromRightToLeft();
            });
        }

        private static void BilingualRow(TableDescriptor t,
            string enLabel, string? val, string arLabel, bool valueIsLtr = false)
        {
            t.Cell().Background("#fdf0f2").Border(1).BorderColor("#e0e0e0")
             .Padding(3).AlignLeft()
             .Text(enLabel).Bold().FontSize(7.5f).FontColor("#8A1538");
            var valueText = t.Cell().Border(1).BorderColor("#e0e0e0")
             .Padding(3).AlignCenter()
             .Text(val ?? "—").FontSize(DocFontSize);
            // A "YYYY\NN" value like "2026\17" sits in an otherwise right-to-left row — without
            // forcing left-to-right here, the digits around the backslash render out of order.
            if (valueIsLtr) valueText.DirectionFromLeftToRight();
            t.Cell().Background("#fdf0f2").Border(1).BorderColor("#e0e0e0")
             .Padding(3).AlignRight()
             .Text(arLabel).Bold().FontSize(7.5f).FontColor("#8A1538")
             .DirectionFromRightToLeft();
        }
    }
}
