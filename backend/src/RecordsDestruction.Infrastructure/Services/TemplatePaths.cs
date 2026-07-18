namespace RecordsDestruction.Infrastructure.Services
{
    /// <summary>Locates the official National Archives of Qatar template files shipped under Templates/,
    /// trying the working directory, app base directory, and the container path used in production.</summary>
    internal static class TemplatePaths
    {
        public static string Resolve(string fileName)
        {
            var candidates = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "Templates", fileName),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", fileName),
                Path.Combine("/app", "Templates", fileName)
            };
            foreach (var c in candidates)
                if (File.Exists(c)) return c;

            throw new FileNotFoundException(
                $"Template file '{fileName}' not found. Looked in: {string.Join(", ", candidates)}");
        }
    }
}
