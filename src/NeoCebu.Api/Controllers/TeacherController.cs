using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Core.DTOs;
using NeoCebu.Core.Entities;
using NeoCebu.Core.Interfaces;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;

namespace NeoCebu.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TeacherController : ControllerBase
{
    private readonly ITeacherService _teacherService;
    private readonly NeoCebuDbContext _dbContext;

    public TeacherController(ITeacherService teacherService, NeoCebuDbContext dbContext)
    {
        _teacherService = teacherService;
        _dbContext = dbContext;
    }

    [HttpGet("my-classrooms")]
    public async Task<IActionResult> GetMyClassrooms()
    {
        var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (teacherId == null) return Unauthorized();

        var classrooms = await _dbContext.Classrooms
            .Where(c => c.TeacherId == teacherId)
            .Select(c => new {
                c.Id,
                c.Name,
                c.Description,
                StudentCount = _dbContext.Enrollments.Count(e => e.ClassroomId == c.Id)
            })
            .ToListAsync();

        return Ok(classrooms);
    }

    [HttpPost("create-classroom")]
    public async Task<IActionResult> CreateClassroom([FromBody] CreateClassroomRequest request)
    {
        var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (teacherId == null) return Unauthorized();

        var classroom = new Classroom
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            TeacherId = teacherId
        };

        _dbContext.Classrooms.Add(classroom);
        await _dbContext.SaveChangesAsync();

        return Ok(classroom);
    }

    [HttpDelete("delete-classroom/{classroomId}")]
    public async Task<IActionResult> DeleteClassroom(Guid classroomId)
    {
        var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (teacherId == null) return Unauthorized();

        var classroom = await _dbContext.Classrooms
            .FirstOrDefaultAsync(c => c.Id == classroomId && c.TeacherId == teacherId);

        if (classroom == null)
        {
            return NotFound("Classroom not found or you are not authorized to delete it.");
        }

        // Remove all enrollments first (manual cleanup due to DeleteBehavior.Restrict or lack of cascade)
        var enrollments = await _dbContext.Enrollments
            .Where(e => e.ClassroomId == classroomId)
            .ToListAsync();
        
        _dbContext.Enrollments.RemoveRange(enrollments);
        
        // Remove the classroom
        _dbContext.Classrooms.Remove(classroom);
        
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Classroom decommissioned successfully." });
    }

    [HttpPost("unenroll-student")]
    public async Task<IActionResult> UnenrollStudent([FromBody] UnenrollRequest request)
    {
        var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (teacherId == null) return Unauthorized();

        var enrollment = await _dbContext.Enrollments
            .Include(e => e.Classroom)
            .FirstOrDefaultAsync(e => e.ClassroomId == request.ClassroomId && 
                                     e.StudentId == request.StudentId && 
                                     e.Classroom.TeacherId == teacherId);

        if (enrollment == null) return NotFound("Enrollment not found or unauthorized.");

        _dbContext.Enrollments.Remove(enrollment);
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Student unenrolled successfully." });
    }

    [HttpGet("student-qr/{studentId}")]
    public async Task<IActionResult> GetStudentQr(string studentId)
    {
        var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (teacherId == null) return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var qrPayload = await _teacherService.GetStudentQrAsync(studentId, teacherId, isAdmin);
        if (qrPayload == null) return Unauthorized("Unauthorized to view this student's QR payload.");

        return Ok(new { qrPayload });
    }

    [HttpPost("provision-student")]
    public async Task<IActionResult> ProvisionStudent([FromBody] ProvisionStudentRequest request)
    {
        var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (teacherId == null) return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        try
        {
            var response = await _teacherService.ProvisionStudentAsync(request, teacherId, isAdmin);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

public record CreateClassroomRequest(string Name, string Description);
public record UnenrollRequest(Guid ClassroomId, string StudentId);
