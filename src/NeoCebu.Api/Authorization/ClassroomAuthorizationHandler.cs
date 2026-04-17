using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;

namespace NeoCebu.Api.Authorization;

public class ClassroomRequirement : IAuthorizationRequirement { }

public class ClassroomAuthorizationHandler : AuthorizationHandler<ClassroomRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly NeoCebuDbContext _dbContext;

    public ClassroomAuthorizationHandler(IHttpContextAccessor httpContextAccessor, NeoCebuDbContext dbContext)
    {
        _httpContextAccessor = httpContextAccessor;
        _dbContext = dbContext;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ClassroomRequirement requirement)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null) return;

        // Try to get classroomId from route or query
        string? classroomIdStr = null;
        if (httpContext.Request.RouteValues.TryGetValue("classroomId", out var classroomIdObj))
        {
            classroomIdStr = classroomIdObj?.ToString();
        }
        else if (httpContext.Request.Query.TryGetValue("classroomId", out var queryClassroomId))
        {
            classroomIdStr = queryClassroomId.ToString();
        }

        if (string.IsNullOrEmpty(classroomIdStr) || !Guid.TryParse(classroomIdStr, out var classroomId)) 
            return;

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return;

        // Verify if user is the Teacher of the classroom or an Enrolled Student
        var isAuthorized = await _dbContext.Classrooms
            .AnyAsync(c => c.Id == classroomId && 
                           (c.TeacherId == userId || 
                            c.Students.Any(s => s.StudentId == userId)));

        if (isAuthorized)
        {
            context.Succeed(requirement);
        }
        else
        {
            // Block instantly (403 Forbidden) as per requirements
            context.Fail();
        }
    }
}
