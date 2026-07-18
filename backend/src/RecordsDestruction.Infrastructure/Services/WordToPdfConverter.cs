namespace RecordsDestruction.Infrastructure.Services
{
    /// <summary>
    /// Converts a .docx to .pdf via Microsoft Word automation (late-bound COM), so the exported PDF is
    /// rendered from the exact same filled official template as the Word export — not a re-implementation.
    /// Requires Word to be installed on the machine running the API; throws if it is not available,
    /// so callers should fall back to a native PDF renderer when this fails.
    /// </summary>
    internal static class WordToPdfConverter
    {
        private const int WdFormatPDF = 17;
        private const int WdAlertsNone = 0;

        public static byte[] ConvertToPdf(byte[] docxBytes)
        {
            byte[]? result = null;
            Exception? error = null;

            var thread = new Thread(() =>
            {
                var tempDocx = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.docx");
                var tempPdf = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.pdf");
                object? wordApp = null;
                object? doc = null;
                try
                {
                    File.WriteAllBytes(tempDocx, docxBytes);

                    var wordType = Type.GetTypeFromProgID("Word.Application")
                        ?? throw new InvalidOperationException("Microsoft Word is not installed on this server.");
                    wordApp = Activator.CreateInstance(wordType)
                        ?? throw new InvalidOperationException("Could not start Microsoft Word.");

                    wordApp.GetType().InvokeMember("Visible", System.Reflection.BindingFlags.SetProperty, null, wordApp, new object[] { false });
                    wordApp.GetType().InvokeMember("DisplayAlerts", System.Reflection.BindingFlags.SetProperty, null, wordApp, new object[] { WdAlertsNone });

                    var documents = wordApp.GetType().InvokeMember("Documents", System.Reflection.BindingFlags.GetProperty, null, wordApp, null);
                    doc = documents!.GetType().InvokeMember("Open", System.Reflection.BindingFlags.InvokeMethod, null, documents,
                        new object[] { tempDocx, false, false });

                    doc!.GetType().InvokeMember("SaveAs", System.Reflection.BindingFlags.InvokeMethod, null, doc,
                        new object[] { tempPdf, WdFormatPDF });
                    doc.GetType().InvokeMember("Close", System.Reflection.BindingFlags.InvokeMethod, null, doc, new object[] { false });

                    wordApp.GetType().InvokeMember("Quit", System.Reflection.BindingFlags.InvokeMethod, null, wordApp, null);

                    result = File.ReadAllBytes(tempPdf);
                }
                catch (Exception ex) { error = ex; }
                finally
                {
                    if (doc is not null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(doc);
                    if (wordApp is not null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(wordApp);
                    try { if (File.Exists(tempDocx)) File.Delete(tempDocx); } catch { }
                    try { if (File.Exists(tempPdf)) File.Delete(tempPdf); } catch { }
                }
            });
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            thread.Join();

            if (error is not null) throw error;
            return result ?? throw new InvalidOperationException("Word-to-PDF conversion produced no output.");
        }
    }
}
