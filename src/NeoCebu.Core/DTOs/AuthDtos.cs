namespace NeoCebu.Core.DTOs;

public record ProvisionStudentRequest(string Email, string UserName, Guid ClassroomId);
public record ProvisionStudentResponse(string StudentId, string QrPayload);

public record QrLoginRequest(string QrPayload);
public record AuthResponse(string Token, DateTime Expiration);

public record TeacherRegistrationRequest(string Email, string UserName, string Password, string AdminSecret);
