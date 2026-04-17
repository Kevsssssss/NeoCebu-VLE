using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using NeoCebu.Core.DTOs;
using NeoCebu.Core.Entities;
using NeoCebu.Core.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace NeoCebu.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITeacherService _teacherService;
    private readonly IConfiguration _configuration;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITeacherService teacherService,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _teacherService = teacherService;
        _configuration = configuration;
    }

    [HttpPost("student-login")]
    public async Task<IActionResult> StudentLogin([FromBody] QrLoginRequest request)
    {
        if (!_teacherService.VerifyQrPayload(request.QrPayload, out string studentId))
        {
            return Unauthorized("Invalid QR Code payload.");
        }

        var student = await _userManager.FindByIdAsync(studentId);
        if (student == null || !student.IsStudent)
        {
            return Unauthorized("Student record not found.");
        }

        // Verify the payload matches what's stored (additional layer of security)
        if (student.QrPayload != request.QrPayload)
        {
            return Unauthorized("QR Code has been revoked or updated.");
        }

        // Reset LastSeen on successful login to prevent immediate session timeout
        student.LastSeen = DateTime.UtcNow;
        await _userManager.UpdateAsync(student);

        var token = GenerateJwtToken(student);
        return Ok(token);
    }

    [HttpPost("teacher-login")]
    public async Task<IActionResult> TeacherLogin([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || user.IsStudent) return Unauthorized("Invalid credentials.");

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) return Unauthorized("Invalid credentials.");

        // Reset LastSeen on successful login to prevent immediate session timeout
        user.LastSeen = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var token = GenerateJwtToken(user);
        return Ok(token);
    }

    [HttpPost("register-teacher")]
    public async Task<IActionResult> RegisterTeacher([FromBody] TeacherRegistrationRequest request)
    {
        Console.WriteLine($"[DEBUG] Received AdminSecret: '{request.AdminSecret}'");
        
        // Trim to prevent accidental spaces from causing failure
        if (request.AdminSecret?.Trim() != "NeoCebu_Admin_2026_Secure")
        {
            return BadRequest(new { message = "Invalid admin authorization secret." });
        }

        var teacher = new ApplicationUser
        {
            UserName = request.UserName,
            Email = request.Email,
            IsStudent = false // Explicitly mark as Teacher
        };

        var result = await _userManager.CreateAsync(teacher, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok(new { message = "Teacher account created successfully." });
    }

    private AuthResponse GenerateJwtToken(ApplicationUser user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);
        var duration = int.Parse(jwtSettings["DurationInMinutes"] ?? "10");
        var expiration = DateTime.UtcNow.AddMinutes(duration);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? ""),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim("is_student", user.IsStudent.ToString().ToLower())
            }),
            Expires = expiration,
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return new AuthResponse(tokenHandler.WriteToken(token), expiration);
    }
}

public record LoginRequest(string Email, string Password);
