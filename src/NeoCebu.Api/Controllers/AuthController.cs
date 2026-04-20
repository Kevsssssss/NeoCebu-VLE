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

        var token = await GenerateJwtToken(student);
        return Ok(token);
    }

    [HttpPost("teacher-login")]
    public async Task<IActionResult> TeacherLogin([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || user.IsStudent) return Unauthorized(new { message = "Invalid credentials." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) return Unauthorized(new { message = "Invalid credentials." });

        // Reset LastSeen on successful login to prevent immediate session timeout
        user.LastSeen = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var token = await GenerateJwtToken(user);
        return Ok(token);
    }

    [HttpPost("admin-login")]
    public async Task<IActionResult> AdminLogin([FromBody] LoginRequest request)
    {
        Console.WriteLine($"[AdminLogin] Attempt for: {request.Email}");
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) 
        {
            Console.WriteLine("[AdminLogin] User not found by email.");
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
        if (!isAdmin) 
        {
            Console.WriteLine("[AdminLogin] User is not in Admin role.");
            return Unauthorized(new { message = "Access denied. Not an administrator." });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) 
        {
            Console.WriteLine($"[AdminLogin] Password check failed for {request.Email}. Locked out: {result.IsLockedOut}");
            return Unauthorized(new { message = "Invalid credentials." });
        }

        Console.WriteLine("[AdminLogin] Success.");
        user.LastSeen = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var token = await GenerateJwtToken(user);
        return Ok(token);
    }

    [HttpPost("register-teacher")]
    public async Task<IActionResult> RegisterTeacher([FromBody] TeacherRegistrationRequest request)
    {
        var configuredSecret = _configuration["SystemSettings:AdminSecret"] ?? "NeoCebu_Admin_2026_Secure";
        
        if (request.AdminSecret?.Trim() != configuredSecret)
        {
            return BadRequest(new { message = "Invalid admin authorization secret." });
        }

        var teacher = new ApplicationUser
        {
            UserName = request.UserName,
            Email = request.Email,
            IsStudent = false
        };

        var result = await _userManager.CreateAsync(teacher, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        await _userManager.AddToRoleAsync(teacher, "Teacher");

        return Ok(new { message = "Teacher account created successfully." });
    }

    private async Task<AuthResponse> GenerateJwtToken(ApplicationUser user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);
        var duration = int.Parse(jwtSettings["DurationInMinutes"] ?? "10");
        var expiration = DateTime.UtcNow.AddMinutes(duration);

        var roles = await _userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? ""),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim("is_student", user.IsStudent.ToString().ToLower())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
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
