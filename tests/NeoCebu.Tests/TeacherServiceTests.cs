using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using NeoCebu.Core.DTOs;
using NeoCebu.Core.Entities;
using NeoCebu.Infrastructure.Data;
using NeoCebu.Infrastructure.Services;
using Xunit;

namespace NeoCebu.Tests;

public class TeacherServiceTests
{
    private readonly NeoCebuDbContext _context;
    private readonly TeacherService _teacherService;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;

    public TeacherServiceTests()
    {
        var options = new DbContextOptionsBuilder<NeoCebuDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new NeoCebuDbContext(options);

        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            new Mock<IUserStore<ApplicationUser>>().Object, null, null, null, null, null, null, null, null);

        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["Jwt:Key"]).Returns("TestSecretKey_32_Characters_Long!!");

        _teacherService = new TeacherService(_userManagerMock.Object, _context, configMock.Object);
    }

    [Fact]
    public void GenerateQrPayload_Should_Return_Decryptable_String()
    {
        // Arrange
        string studentId = Guid.NewGuid().ToString();
        string salt = "test-salt";

        // Act
        string payload = _teacherService.GenerateQrPayload(studentId, salt);
        bool isValid = _teacherService.VerifyQrPayload(payload, out string decryptedId);

        // Assert
        Assert.True(isValid);
        Assert.Equal(studentId, decryptedId);
    }

    [Fact]
    public async Task ProvisionStudent_Should_Fail_If_Teacher_Does_Not_Own_Classroom()
    {
        // Arrange
        var teacherId = "teacher-1";
        var otherTeacherId = "teacher-2";
        var classroom = new Classroom { Id = Guid.NewGuid(), Name = "Class A", TeacherId = otherTeacherId };
        _context.Classrooms.Add(classroom);
        await _context.SaveChangesAsync();

        var request = new ProvisionStudentRequest("test@edu.ph", "student1", classroom.Id);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
            _teacherService.ProvisionStudentAsync(request, teacherId));
    }

    [Fact]
    public async Task ProvisionStudent_Should_Succeed_And_Enroll_Student()
    {
        // Arrange
        var teacherId = "teacher-1";
        var classroom = new Classroom { Id = Guid.NewGuid(), Name = "Class A", TeacherId = teacherId };
        _context.Classrooms.Add(classroom);
        await _context.SaveChangesAsync();

        var request = new ProvisionStudentRequest("student@edu.ph", "student1", classroom.Id);

        _userManagerMock.Setup(u => u.CreateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(u => u.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var response = await _teacherService.ProvisionStudentAsync(request, teacherId);

        // Assert
        Assert.NotNull(response.QrPayload);
        var enrollment = await _context.Enrollments.FirstOrDefaultAsync(e => e.ClassroomId == classroom.Id);
        Assert.NotNull(enrollment);
    }
}
