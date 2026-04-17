using Microsoft.AspNetCore.Identity;
using NeoCebu.Core.Entities;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;

namespace NeoCebu.Api.Middleware;

public class SessionTimeoutMiddleware
{
    private readonly RequestDelegate _next;
    private const int TimeoutMinutes = 10;

    public SessionTimeoutMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, UserManager<ApplicationUser> userManager, NeoCebuDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId != null)
            {
                var user = await userManager.FindByIdAsync(userId);
                if (user != null)
                {
                    var now = DateTime.UtcNow;
                    if (user.LastSeen.HasValue && (now - user.LastSeen.Value).TotalMinutes > TimeoutMinutes)
                    {
                        // Aggressive Timeout: Session is too old
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsJsonAsync(new { message = "Session expired due to 10-minute inactivity rule." });
                        return;
                    }

                    // Update LastSeen
                    user.LastSeen = now;
                    await userManager.UpdateAsync(user);
                }
            }
        }

        await _next(context);
    }
}
