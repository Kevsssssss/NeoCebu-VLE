using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Core.Entities;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;

namespace NeoCebu.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly NeoCebuDbContext _context;
    private readonly IConfiguration _configuration;

    public AdminController(
        UserManager<ApplicationUser> userManager,
        NeoCebuDbContext context,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("teachers")]
    public async Task<IActionResult> GetTeachers()
    {
        var teachers = await _userManager.GetUsersInRoleAsync("Teacher");
        return Ok(teachers.Select(t => new {
            t.Id,
            t.UserName,
            t.Email
        }));
    }

    [HttpDelete("teacher/{id}")]
    public async Task<IActionResult> DeleteTeacher(string id)
    {
        var teacher = await _userManager.FindByIdAsync(id);
        if (teacher == null) return NotFound();

        var result = await _userManager.DeleteAsync(teacher);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { message = "Teacher deleted successfully." });
    }

    [HttpGet("settings")]
    public IActionResult GetSettings()
    {
        return Ok(new {
            adminSecret = _configuration["SystemSettings:AdminSecret"] ?? "NeoCebu_Admin_2026_Secure"
        });
    }

    [HttpPost("settings/secret")]
    public IActionResult UpdateSecret([FromBody] UpdateSecretRequest request)
    {
        // In a real app, this would be saved to a database table or persistent config
        // For this prototype, we'll acknowledge the request. 
        // Note: IConfiguration is read-only at runtime usually.
        return Ok(new { message = "Secret updated (Note: In this prototype, changes are transient)." });
    }

    [HttpGet("classrooms")]
    public async Task<IActionResult> GetClassrooms()
    {
        var classrooms = await _context.Classrooms
            .Include(c => c.Teacher)
            .Select(c => new {
                c.Id,
                c.Name,
                teacherName = c.Teacher.UserName,
                studentCount = c.Students.Count
            })
            .ToListAsync();
        
        return Ok(classrooms);
    }

    [HttpPost("update-account")]
    public async Task<IActionResult> UpdateAccount([FromBody] UpdateAdminAccountRequest request)
    {
        var adminId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (adminId == null) return Unauthorized();

        var admin = await _userManager.FindByIdAsync(adminId);
        if (admin == null) return NotFound();

        if (!string.IsNullOrEmpty(request.NewUserName))
        {
            admin.UserName = request.NewUserName;
        }

        if (!string.IsNullOrEmpty(request.NewEmail))
        {
            admin.Email = request.NewEmail;
        }

        var updateResult = await _userManager.UpdateAsync(admin);
        if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);

        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(admin);
            var passwordResult = await _userManager.ResetPasswordAsync(admin, token, request.NewPassword);
            if (!passwordResult.Succeeded) return BadRequest(passwordResult.Errors);
        }

        return Ok(new { message = "Account updated successfully." });
    }
}

public record UpdateSecretRequest(string NewSecret);
public record UpdateAdminAccountRequest(string? NewUserName, string? NewEmail, string? NewPassword);
