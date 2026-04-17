using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Moq;
using NeoCebu.Api.Middleware;
using NeoCebu.Core.Entities;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;
using Xunit;
using Microsoft.EntityFrameworkCore;

namespace NeoCebu.Tests;

public class SessionTimeoutMiddlewareTests
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly NeoCebuDbContext _context;

    public SessionTimeoutMiddlewareTests()
    {
        var options = new DbContextOptionsBuilder<NeoCebuDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new NeoCebuDbContext(options);

        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            new Mock<IUserStore<ApplicationUser>>().Object, null, null, null, null, null, null, null, null);
    }

    [Fact]
    public async Task InvokeAsync_Should_Block_If_LastSeen_Exceeds_10_Minutes()
    {
        // Arrange
        var userId = "user-123";
        var user = new ApplicationUser { Id = userId, LastSeen = DateTime.UtcNow.AddMinutes(-11) };
        
        _userManagerMock.Setup(u => u.FindByIdAsync(userId)).ReturnsAsync(user);

        var context = new DefaultHttpContext();
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        RequestDelegate next = (innerContext) => Task.CompletedTask;
        var middleware = new SessionTimeoutMiddleware(next);

        // Act
        await middleware.InvokeAsync(context, _userManagerMock.Object, _context);

        // Assert
        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_Should_Allow_And_Update_LastSeen_If_Within_Timeout()
    {
        // Arrange
        var userId = "user-123";
        var user = new ApplicationUser { Id = userId, LastSeen = DateTime.UtcNow.AddMinutes(-5) };
        
        _userManagerMock.Setup(u => u.FindByIdAsync(userId)).ReturnsAsync(user);
        _userManagerMock.Setup(u => u.UpdateAsync(It.IsAny<ApplicationUser>())).ReturnsAsync(IdentityResult.Success);

        var context = new DefaultHttpContext();
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        bool nextCalled = false;
        RequestDelegate next = (innerContext) => { nextCalled = true; return Task.CompletedTask; };
        var middleware = new SessionTimeoutMiddleware(next);

        // Act
        await middleware.InvokeAsync(context, _userManagerMock.Object, _context);

        // Assert
        Assert.True(nextCalled);
        _userManagerMock.Verify(u => u.UpdateAsync(It.Is<ApplicationUser>(user => user.Id == userId)), Times.Once);
    }
}
