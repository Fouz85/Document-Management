using System.IO.Compression;
using System.Text;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;
using WP = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services
{
    /// <summary>Fills the official National Archives of Qatar "استمارة إتلاف وثائق" Word template
    /// (Templates/destruction-form-template.docx) instead of building a document from scratch.</summary>
    internal static class WordGenerator
    {
        // 14pt everywhere — bigger than the template's own ~10pt default, so the whole document
        // (not just the records table) stays legible, including multi-line entries (e.g. several
        // schools listed one per line).
        private const int DocFontSize = 28;

        public static byte[] GenerateDestructionRequestDocx(DestructionRequest r)
        {
            using var ms = new MemoryStream();
            using (var fs = File.OpenRead(TemplatePaths.Resolve("destruction-form-template.docx")))
                fs.CopyTo(ms);
            ms.Position = 0;

            using (var doc = WordprocessingDocument.Open(ms, true))
            {
                var body = doc.MainDocumentPart!.Document.Body!;
                var tables = body.Elements<Table>().ToList();

                FillInfoTable(tables[0], r);
                FillRecordsTable(tables[1], r);
                FillSignatureTable(doc, tables[2], r);

                doc.MainDocumentPart.Document.Save();
            }

            return FixRootLevelMediaParts(ms.ToArray());
        }

        /// <summary>
        /// Works around an OpenXml SDK part-naming quirk: when a template already has gaps in its
        /// media numbering (e.g. image7.png / image70.png), newly added image parts get written to a
        /// package-root "/media/" folder with an absolute relationship target instead of "word/media/",
        /// which Word fails to resolve (the picture renders blank). This relocates such parts and
        /// rewrites their relationship targets to be relative to word/document.xml, where Word expects them.
        /// </summary>
        private static byte[] FixRootLevelMediaParts(byte[] docxBytes)
        {
            using var ms = new MemoryStream();
            ms.Write(docxBytes, 0, docxBytes.Length);

            using (var archive = new ZipArchive(ms, ZipArchiveMode.Update, leaveOpen: true))
            {
                var stray = archive.Entries
                    .Where(e => e.FullName.StartsWith("media/", StringComparison.Ordinal))
                    .ToList();
                if (stray.Count == 0) return docxBytes;

                var existingWordMediaNames = archive.Entries
                    .Where(e => e.FullName.StartsWith("word/media/", StringComparison.Ordinal))
                    .Select(e => e.FullName)
                    .ToHashSet(StringComparer.Ordinal);

                var renames = new Dictionary<string, string>(); // old "media/x.png" -> new "media/unique.png"
                foreach (var entry in stray)
                {
                    var oldRelativeName = entry.FullName; // e.g. "media/image7.png"
                    var ext = Path.GetExtension(oldRelativeName);
                    string newWordPath;
                    do { newWordPath = $"word/media/sig_{Guid.NewGuid():N}{ext}"; }
                    while (existingWordMediaNames.Contains(newWordPath));
                    existingWordMediaNames.Add(newWordPath);
                    renames[oldRelativeName] = newWordPath["word/".Length..];

                    byte[] bytes;
                    using (var s = entry.Open()) using (var buf = new MemoryStream()) { s.CopyTo(buf); bytes = buf.ToArray(); }
                    var newEntry = archive.CreateEntry(newWordPath);
                    using (var s = newEntry.Open()) s.Write(bytes, 0, bytes.Length);
                    entry.Delete();
                }

                var relsEntry = archive.GetEntry("word/_rels/document.xml.rels");
                if (relsEntry is not null)
                {
                    string text;
                    using (var s = relsEntry.Open()) using (var reader = new StreamReader(s, Encoding.UTF8)) text = reader.ReadToEnd();
                    foreach (var (oldName, newName) in renames)
                        text = text.Replace($"Target=\"/{oldName}\"", $"Target=\"{newName}\"");
                    relsEntry.Delete();
                    var newRels = archive.CreateEntry("word/_rels/document.xml.rels");
                    using var writer = new StreamWriter(newRels.Open(), new UTF8Encoding(false));
                    writer.Write(text);
                }
            }

            return ms.ToArray();
        }

        private static TableCell Cell(Table t, int row, int col) =>
            t.Elements<TableRow>().ElementAt(row).Elements<TableCell>().ElementAt(col);

        private static void SetCellText(TableCell cell, string? value, bool center = false, int? fontSizeHalfPoints = null, bool rtl = true)
        {
            var para = cell.Elements<Paragraph>().FirstOrDefault();
            if (para is null) return;
            foreach (var run in para.Elements<Run>().ToList()) run.Remove();
            if (center)
            {
                para.ParagraphProperties ??= new ParagraphProperties();
                para.ParagraphProperties.Justification = new Justification { Val = JustificationValues.Center };
            }
            // A raw "\n" inside <w:t> isn't a line break in OOXML — split on it and join the runs
            // with an explicit <w:br/>, so multi-line input (e.g. one school per line) renders as
            // separate lines instead of one run of text with the newlines silently dropped.
            var lines = (value ?? "—").Replace("\r\n", "\n").Split('\n');
            for (int i = 0; i < lines.Length; i++)
            {
                if (i > 0) para.AppendChild(new Run(new Break()));
                var run = new Run(new Text(lines[i]) { Space = SpaceProcessingModeValues.Preserve });
                // The template's own runs are marked right-to-left; a freshly-created Run isn't, and
                // without that flag Word's bidi algorithm can visually reorder mixed Arabic/Latin
                // content (e.g. "A4" or "(...)" embedded in an Arabic phrase) even though the
                // underlying text is stored in the correct order. A pure "YYYY\NN" code (Destruction
                // No.) is the opposite case — it must stay left-to-right, so callers pass rtl: false.
                var props = new RunProperties();
                if (rtl) props.Append(new RightToLeftText());
                if (fontSizeHalfPoints is not null)
                {
                    // Word uses w:sz for Latin/digit runs and w:szCs for Arabic (complex-script) runs —
                    // both need setting, or Arabic text silently keeps the template's original size.
                    var sz = fontSizeHalfPoints.Value.ToString();
                    props.Append(new FontSize { Val = sz });
                    props.Append(new FontSizeComplexScript { Val = sz });
                }
                run.RunProperties = props;
                para.AppendChild(run);
            }
        }

        private static void FillInfoTable(Table t, DestructionRequest r)
        {
            SetCellText(Cell(t, 0, 1), r.ConcernedParty, fontSizeHalfPoints: DocFontSize);
            SetCellText(Cell(t, 1, 1), r.DestructionNo, fontSizeHalfPoints: DocFontSize, rtl: false);
            SetCellText(Cell(t, 4, 1), RecordLabels.SectionOrDepartment(r.Department), fontSizeHalfPoints: DocFontSize);
            SetCellText(Cell(t, 5, 1), r.ResponsibleOfficer, fontSizeHalfPoints: DocFontSize);
            SetCellText(Cell(t, 6, 1), r.Email, fontSizeHalfPoints: DocFontSize, rtl: false);
            SetCellText(Cell(t, 7, 1), r.Phone, fontSizeHalfPoints: DocFontSize, rtl: false);
            SetCellText(Cell(t, 10, 1), r.StorageLocation, fontSizeHalfPoints: DocFontSize);
            SetCellText(Cell(t, 11, 1), RecordLabels.VolumeText(r.TotalVolume), fontSizeHalfPoints: DocFontSize);
            SetCellText(Cell(t, 12, 1), RecordLabels.YearOnly(r.RecordsFirstDate), center: true, fontSizeHalfPoints: DocFontSize);
            SetCellText(Cell(t, 13, 1), RecordLabels.YearOnly(r.RecordsLastDate), center: true, fontSizeHalfPoints: DocFontSize);
        }

        private static void FillRecordsTable(Table t, DestructionRequest r)
        {
            var records = r.Records.OrderBy(x => x.SerialNo).ToList();
            var templateRow = t.Elements<TableRow>().ElementAt(1);

            int existingDataRows = t.Elements<TableRow>().Count() - 1;
            for (int i = existingDataRows; i < records.Count; i++)
                t.AppendChild((TableRow)templateRow.CloneNode(true));

            var dataRows = t.Elements<TableRow>().Skip(1).ToList();
            for (int i = 0; i < records.Count; i++)
            {
                var rec = records[i];
                var cells = dataRows[i].Elements<TableCell>().ToList();
                string copyLabel = rec.OriginalOrCopy == "Original" ? "أصل"
                                  : rec.OriginalOrCopy == "Copy" ? "صورة"
                                  : rec.OriginalOrCopy ?? "—";

                SetCellText(cells[0], rec.SerialNo.ToString(), center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[1], rec.RecordsTitle, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[2], copyLabel, center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[3], RecordLabels.TypeLabel(rec.RecordsType), center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[4], RecordLabels.MediumLabel(rec.StorageMedium), center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[5], rec.RetentionRuleNo ?? "/", center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[6], RecordLabels.YearOnly(rec.FirstDate), center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[7], RecordLabels.YearOnly(rec.LastDate), center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[8], RecordLabels.VolumeText(rec.RecordsVolume), center: true, fontSizeHalfPoints: DocFontSize);
                SetCellText(cells[9], rec.Remarks ?? "", fontSizeHalfPoints: DocFontSize);
            }
        }

        private static void FillSignatureTable(WordprocessingDocument doc, Table t, DestructionRequest r)
        {
            var blocks = new[]
            {
                (col: 0, name: r.CreatorUnitName,       date: r.CreatorUnitDate,       sig: r.CreatorUnitSignature),
                (col: 1, name: r.LegalAffairsName,      date: r.LegalAffairsDate,      sig: r.LegalAffairsSignature),
                (col: 2, name: r.InternalAuditName,     date: r.InternalAuditDate,     sig: r.InternalAuditSignature),
                (col: 3, name: r.RecordsManagementName, date: r.RecordsManagementDate, sig: r.RecordsManagementSignature),
            };

            foreach (var b in blocks)
            {
                SetCellText(Cell(t, 2, b.col), b.name, fontSizeHalfPoints: DocFontSize);
                SetCellText(Cell(t, 4, b.col), b.date?.ToString("dd/MM/yyyy"), fontSizeHalfPoints: DocFontSize);

                if (!string.IsNullOrEmpty(b.sig) && b.sig.StartsWith("data:image"))
                {
                    try
                    {
                        var bytes = Convert.FromBase64String(b.sig.Split(',')[1]);
                        InsertImage(doc, Cell(t, 6, b.col), bytes);
                    }
                    catch { }
                }
            }
        }

        private static void InsertImage(WordprocessingDocument doc, TableCell cell, byte[] imageBytes)
        {
            var mainPart = doc.MainDocumentPart!;
            var relId = "rIdSig" + Guid.NewGuid().ToString("N");
            var imagePart = mainPart.AddImagePart(ImagePartType.Png, relId);
            using (var stream = new MemoryStream(imageBytes)) imagePart.FeedData(stream);

            const long emuPerPixel = 9525;
            long widthEmu = 190 * emuPerPixel;
            long heightEmu = 80 * emuPerPixel;

            var element = new Drawing(
                new WP.Inline(
                    new WP.Extent { Cx = widthEmu, Cy = heightEmu },
                    new WP.DocProperties { Id = 1, Name = "Signature" },
                    new A.Graphic(
                        new A.GraphicData(
                            new PIC.Picture(
                                new PIC.NonVisualPictureProperties(
                                    new PIC.NonVisualDrawingProperties { Id = 0, Name = "signature.png" },
                                    new PIC.NonVisualPictureDrawingProperties()),
                                new PIC.BlipFill(
                                    new A.Blip { Embed = relId },
                                    new A.Stretch(new A.FillRectangle())),
                                new PIC.ShapeProperties(
                                    new A.Transform2D(
                                        new A.Offset { X = 0, Y = 0 },
                                        new A.Extents { Cx = widthEmu, Cy = heightEmu }),
                                    new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle })
                            )
                        ) { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" })
                )
                { DistanceFromTop = 0, DistanceFromBottom = 0, DistanceFromLeft = 0, DistanceFromRight = 0 });

            var para = cell.Elements<Paragraph>().FirstOrDefault();
            if (para is null) return;
            foreach (var run in para.Elements<Run>().ToList()) run.Remove();
            para.AppendChild(new Run(element));
        }
    }
}
