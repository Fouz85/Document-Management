using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.InteropServices;

namespace RecordsDestruction.Infrastructure.Services;

/// <summary>
/// Keeps a single Microsoft Word COM instance alive for the API process's lifetime instead of
/// launching and quitting Word on every PDF export. Word's own startup/shutdown was the dominant
/// cost of each export (~10+ seconds out of ~13), not the document conversion itself, so reusing
/// one instance across requests cuts that down to roughly the cost of opening/closing one document.
/// COM requires all calls to happen on the same STA thread that created the object, so conversions
/// are queued to a single dedicated background thread rather than run inline.
/// </summary>
public sealed class WordComHost : IDisposable
{
    private const int WdFormatPDF = 17;
    private const int WdAlertsNone = 0;

    private readonly BlockingCollection<(byte[] Docx, TaskCompletionSource<byte[]> Result)> _queue = new();
    private readonly Thread _thread;

    public WordComHost()
    {
        _thread = new Thread(RunLoop) { IsBackground = true, Name = "WordComHost" };
        _thread.SetApartmentState(ApartmentState.STA);
        _thread.Start();
    }

    public Task<byte[]> ConvertToPdfAsync(byte[] docxBytes)
    {
        var tcs = new TaskCompletionSource<byte[]>(TaskCreationOptions.RunContinuationsAsynchronously);
        _queue.Add((docxBytes, tcs));
        return tcs.Task;
    }

    private void RunLoop()
    {
        object? wordApp = null;
        try
        {
            foreach (var (docxBytes, tcs) in _queue.GetConsumingEnumerable())
            {
                try
                {
                    wordApp ??= StartWord();
                    tcs.SetResult(ConvertOne(wordApp, docxBytes));
                }
                catch (Exception ex)
                {
                    tcs.SetException(ex);
                    // The instance may be in a bad state (e.g. Word crashed) — drop it so the next job starts fresh.
                    try { if (wordApp is not null) Marshal.FinalReleaseComObject(wordApp); } catch { }
                    wordApp = null;
                }
            }
        }
        finally
        {
            if (wordApp is not null)
            {
                try { wordApp.GetType().InvokeMember("Quit", BindingFlags.InvokeMethod, null, wordApp, null); } catch { }
                try { Marshal.FinalReleaseComObject(wordApp); } catch { }
            }
        }
    }

    private static object StartWord()
    {
        var wordType = Type.GetTypeFromProgID("Word.Application")
            ?? throw new InvalidOperationException("Microsoft Word is not installed on this server.");
        var wordApp = Activator.CreateInstance(wordType)
            ?? throw new InvalidOperationException("Could not start Microsoft Word.");

        wordApp.GetType().InvokeMember("Visible", BindingFlags.SetProperty, null, wordApp, new object[] { false });
        wordApp.GetType().InvokeMember("DisplayAlerts", BindingFlags.SetProperty, null, wordApp, new object[] { WdAlertsNone });
        return wordApp;
    }

    private static byte[] ConvertOne(object wordApp, byte[] docxBytes)
    {
        var tempDocx = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.docx");
        var tempPdf = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.pdf");
        object? doc = null;
        try
        {
            File.WriteAllBytes(tempDocx, docxBytes);

            var documents = wordApp.GetType().InvokeMember("Documents", BindingFlags.GetProperty, null, wordApp, null);
            doc = documents!.GetType().InvokeMember("Open", BindingFlags.InvokeMethod, null, documents,
                new object[] { tempDocx, false, false });

            doc!.GetType().InvokeMember("SaveAs", BindingFlags.InvokeMethod, null, doc, new object[] { tempPdf, WdFormatPDF });
            doc.GetType().InvokeMember("Close", BindingFlags.InvokeMethod, null, doc, new object[] { false });

            return File.ReadAllBytes(tempPdf);
        }
        finally
        {
            if (doc is not null) Marshal.FinalReleaseComObject(doc);
            try { if (File.Exists(tempDocx)) File.Delete(tempDocx); } catch { }
            try { if (File.Exists(tempPdf)) File.Delete(tempPdf); } catch { }
        }
    }

    public void Dispose()
    {
        _queue.CompleteAdding();
        _thread.Join(TimeSpan.FromSeconds(5));
    }
}
