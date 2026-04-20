using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Core.Entities;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;

namespace NeoCebu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ClassroomController : ControllerBase
{
    private readonly NeoCebuDbContext _dbContext;

    public ClassroomController(NeoCebuDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("student-classrooms")]
    public async Task<IActionResult> GetStudentClassrooms()
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (studentId == null) return Unauthorized();

        var classrooms = await _dbContext.Enrollments
            .Where(e => e.StudentId == studentId)
            .Select(e => new {
                e.Classroom.Id,
                e.Classroom.Name,
                e.Classroom.Description,
                TeacherName = e.Classroom.Teacher.UserName
            })
            .ToListAsync();

        return Ok(classrooms);
    }

    [Authorize(Policy = "ClassroomPolicy")]
    [HttpGet("{classroomId}")]
    public async Task<IActionResult> GetClassroomDetails(Guid classroomId)
    {
        var classroom = await _dbContext.Classrooms
            .Include(c => c.Teacher)
            .Include(c => c.Students)
                .ThenInclude(s => s.Student)
            .FirstOrDefaultAsync(c => c.Id == classroomId);

        if (classroom == null) return NotFound();

        return Ok(new
        {
            classroom.Id,
            classroom.Name,
            classroom.Description,
            TeacherName = classroom.Teacher.UserName,
            StudentCount = classroom.Students.Count
        });
    }

    [Authorize(Policy = "ClassroomPolicy")]
    [HttpGet("{classroomId}/students")]
    public async Task<IActionResult> GetStudents(Guid classroomId)
    {
        var enrollments = await _dbContext.Enrollments
            .Include(e => e.Student)
            .Where(e => e.ClassroomId == classroomId)
            .ToListAsync();

        var classroomIdStr = classroomId.ToString();
        var students = enrollments.Select(e => new
        {
            e.Student.Id,
            e.Student.UserName,
            e.Student.Email,
            IsOnline = Hubs.ChatHub.IsUserOnline(classroomIdStr, e.Student.Id)
        });

        return Ok(students);
    }

    [Authorize(Policy = "ClassroomPolicy")]
    [HttpGet("{classroomId}/chat-history")]
    public async Task<IActionResult> GetChatHistory(Guid classroomId)
    {
        var messages = await _dbContext.ChatMessages
            .Include(m => m.User)
            .Where(m => m.ClassroomId == classroomId)
            .OrderByDescending(m => m.Timestamp)
            .Take(50)
            .ToListAsync();

        var result = new List<object>();
        var userManager = HttpContext.RequestServices.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<ApplicationUser>>();

        foreach (var m in messages.OrderBy(m => m.Timestamp))
        {
            var user = m.User;
            var isAdmin = await userManager.IsInRoleAsync(user, "Admin");
            
            result.Add(new
            {
                User = user.UserName,
                Text = m.Text,
                IsTeacher = m.IsTeacher,
                UserId = m.UserId,
                Timestamp = m.Timestamp,
                IsFile = m.IsFile,
                FileName = m.FileName,
                FileUrl = m.FileUrl,
                isAdmin = isAdmin
            });
        }

        return Ok(result);
    }

    [Authorize(Policy = "ClassroomPolicy")]
    [HttpGet("{classroomId}/blackboard")]
    public async Task<IActionResult> GetBlackboardItems(Guid classroomId)
    {
        var items = await _dbContext.BlackboardItems
            .Where(b => b.ClassroomId == classroomId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(items);
    }

    [Authorize(Policy = "ClassroomPolicy")]
    [HttpPost("{classroomId}/blackboard")]
    public async Task<IActionResult> PostBlackboardItem(Guid classroomId, [FromBody] BlackboardPostRequest request)
    {
        var isStudentClaim = User.FindFirst("is_student")?.Value;
        if (isStudentClaim == "true") return Forbid();

        var item = new BlackboardItem
        {
            Id = Guid.NewGuid(),
            ClassroomId = classroomId,
            Title = request.Title,
            Description = request.Description,
            FileName = request.FileName,
            FileUrl = request.FileUrl,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.BlackboardItems.Add(item);
        await _dbContext.SaveChangesAsync();

        return Ok(item);
    }
}

public record BlackboardPostRequest(string Title, string Description, string? FileName, string? FileUrl);
