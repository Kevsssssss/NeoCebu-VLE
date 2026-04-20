using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Core.Entities;
using NeoCebu.Infrastructure.Data;
using System.Security.Claims;
using System.Text.Json.Serialization;

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
    public async Task<IActionResult> GetSettings()
    {
        var secret = await _context.SystemSettings.FindAsync("AdminSecret");
        var value = secret?.Value ?? _configuration["SystemSettings:AdminSecret"] ?? "NeoCebu_Admin_2026_Secure";
        Console.WriteLine($"[AdminController] GetSettings: {value} (Source: {(secret == null ? "Config" : "DB")})");
        return Ok(new {
            adminSecret = value
        });
    }

    [HttpPost("settings/secret")]
    public async Task<IActionResult> UpdateSecret([FromBody] UpdateSecretRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewSecret))
        {
            return BadRequest(new { message = "Secret cannot be empty." });
        }

        Console.WriteLine($"[AdminController] Updating AdminSecret to: {request.NewSecret}");
        var secret = await _context.SystemSettings.FindAsync("AdminSecret");
        if (secret == null)
        {
            _context.SystemSettings.Add(new SystemSetting { Key = "AdminSecret", Value = request.NewSecret });
            Console.WriteLine("[AdminController] Added new AdminSecret record.");
        }
        else
        {
            secret.Value = request.NewSecret;
            Console.WriteLine("[AdminController] Updated existing AdminSecret record.");
        }
        
        await _context.SaveChangesAsync();
        return Ok(new { message = "Security protocol updated successfully." });
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

public record UpdateSecretRequest(
    [property: JsonPropertyName("newSecret")] string NewSecret
);

public record UpdateAdminAccountRequest(
    [property: JsonPropertyName("newUserName")] string? NewUserName,
    [property: JsonPropertyName("newEmail")] string? NewEmail,
    [property: JsonPropertyName("newPassword")] string? NewPassword
);
