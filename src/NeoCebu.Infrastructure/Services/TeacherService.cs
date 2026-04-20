using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NeoCebu.Core.DTOs;
using NeoCebu.Core.Entities;
using NeoCebu.Core.Interfaces;
using NeoCebu.Infrastructure.Data;

namespace NeoCebu.Infrastructure.Services;

public class TeacherService : ITeacherService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly NeoCebuDbContext _dbContext;
    private readonly string _encryptionKey;

    public TeacherService(
        UserManager<ApplicationUser> userManager, 
        NeoCebuDbContext dbContext,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _encryptionKey = configuration["Jwt:Key"] ?? "Default_Fallback_Key_32_Chars_Long!!";
    }

    public async Task<ProvisionStudentResponse> ProvisionStudentAsync(ProvisionStudentRequest request, string teacherId, bool isAdmin = false)
    {
        Console.WriteLine($"[DEBUG] Provisioning student: {request.Email} for classroom: {request.ClassroomId} by teacher: {teacherId} (Admin: {isAdmin})");

        // 1. Verify classroom belongs to teacher (Admins bypass this)
        var classroom = await _dbContext.Classrooms
            .FirstOrDefaultAsync(c => c.Id == request.ClassroomId && (c.TeacherId == teacherId || isAdmin));
        
        if (classroom == null) 
        {
            Console.WriteLine("[DEBUG] Classroom not found or does not belong to teacher.");
            throw new UnauthorizedAccessException("Unauthorized to provision for this classroom.");
        }

        // 2. Check if student already exists
        var student = await _userManager.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        
        if (student != null)
        {
            // Verify if student is already in this specific classroom
            var alreadyEnrolled = await _dbContext.Enrollments
                .AnyAsync(e => e.ClassroomId == request.ClassroomId && e.StudentId == student.Id);
            
            if (alreadyEnrolled)
            {
                throw new Exception("This student is already enrolled in this classroom.");
            }

            // Student exists but is not in this class - just enroll them
            _dbContext.Enrollments.Add(new ClassroomEnrollment
            {
                ClassroomId = request.ClassroomId,
                StudentId = student.Id
            });
            await _dbContext.SaveChangesAsync();

            return new ProvisionStudentResponse(student.Id, student.QrPayload ?? "");
        }

        // 3. Create new student account (No Password)
        student = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = request.Email, // Use email as username for uniqueness
            Email = request.Email,
            IsStudent = true
        };

        var result = await _userManager.CreateAsync(student);
        if (!result.Succeeded) 
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            Console.WriteLine($"[DEBUG] Identity Creation Failed: {errors}");
            throw new Exception($"Failed to create student: {errors}");
        }

        // 4. Generate QR Payload
        string salt = Guid.NewGuid().ToString();
        string payload = GenerateQrPayload(student.Id, salt);
        
        student.QrPayload = payload;
        await _userManager.UpdateAsync(student);

        // 5. Enroll in classroom
        try 
        {
            _dbContext.Enrollments.Add(new ClassroomEnrollment
            {
                ClassroomId = request.ClassroomId,
                StudentId = student.Id
            });
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DEBUG] Enrollment Failed: {ex.Message}");
            throw;
        }

        Console.WriteLine("[DEBUG] Student provisioned successfully.");
        return new ProvisionStudentResponse(student.Id, payload);
    }

    public async Task<string?> GetStudentQrAsync(string studentId, string teacherId, bool isAdmin = false)
    {
        // Security check: Only allow if the teacher owns a classroom where this student is enrolled
        // Admins bypass this and have global visibility
        var isAuthorized = isAdmin || await _dbContext.Enrollments
            .AnyAsync(e => e.StudentId == studentId && e.Classroom.TeacherId == teacherId);

        if (!isAuthorized) return null;

        var student = await _userManager.FindByIdAsync(studentId);
        return student?.QrPayload;
    }

    public string GenerateQrPayload(string studentId, string salt)
    {
        string rawData = $"{studentId}|{salt}|{DateTime.UtcNow.Ticks}";
        return Encrypt(rawData);
    }

    public bool VerifyQrPayload(string payload, out string studentId)
    {
        studentId = string.Empty;
        try
        {
            string decrypted = Decrypt(payload);
            var parts = decrypted.Split('|');
            if (parts.Length != 3) return false;
            
            studentId = parts[0];
            // Additional checks (like timestamp expiry) could be added here
            return true;
        }
        catch
        {
            return false;
        }
    }

    private string Encrypt(string text)
    {
        byte[] key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();
        
        using var encryptor = aes.CreateEncryptor();
        byte[] plainText = Encoding.UTF8.GetBytes(text);
        byte[] cipherText = encryptor.TransformFinalBlock(plainText, 0, plainText.Length);
        
        byte[] combined = new byte[aes.IV.Length + cipherText.Length];
        Buffer.BlockCopy(aes.IV, 0, combined, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherText, 0, combined, aes.IV.Length, cipherText.Length);
        
        return Convert.ToBase64String(combined);
    }

    private string Decrypt(string cipherTextWithIv)
    {
        byte[] combined = Convert.FromBase64String(cipherTextWithIv);
        byte[] key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        
        using var aes = Aes.Create();
        aes.Key = key;
        
        byte[] iv = new byte[aes.BlockSize / 8];
        byte[] cipherText = new byte[combined.Length - iv.Length];
        
        Buffer.BlockCopy(combined, 0, iv, 0, iv.Length);
        Buffer.BlockCopy(combined, iv.Length, cipherText, 0, cipherText.Length);
        
        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor();
        byte[] plainText = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
        
        return Encoding.UTF8.GetString(plainText);
    }
}
