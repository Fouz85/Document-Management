namespace RecordsDestruction.Api.Middleware;

/// <summary>Security by design: OWASP-recommended HTTP response headers on every response.</summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var h = context.Response.Headers;
        h["X-Content-Type-Options"] = "nosniff";
        h["X-Frame-Options"] = "DENY";
        h["Referrer-Policy"] = "no-referrer";
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        h.Remove("Server");
        await _next(context);
    }
}
