using NeoCebu.Core.DTOs;

namespace NeoCebu.Core.Interfaces;

public interface ITeacherService
{
    Task<ProvisionStudentResponse> ProvisionStudentAsync(ProvisionStudentRequest request, string teacherId);
    Task<string?> GetStudentQrAsync(string studentId, string teacherId);
    string GenerateQrPayload(string studentId, string salt);
    bool VerifyQrPayload(string payload, out string studentId);
}
