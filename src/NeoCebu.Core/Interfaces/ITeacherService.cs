using NeoCebu.Core.DTOs;

namespace NeoCebu.Core.Interfaces;

public interface ITeacherService
{
    Task<ProvisionStudentResponse> ProvisionStudentAsync(ProvisionStudentRequest request, string teacherId, bool isAdmin = false);
    Task<string?> GetStudentQrAsync(string studentId, string teacherId, bool isAdmin = false);
    string GenerateQrPayload(string studentId, string salt);
    bool VerifyQrPayload(string payload, out string studentId);
}
