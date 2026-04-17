using Microsoft.Extensions.Configuration;
using NeoCebu.Core.DTOs;
using NeoCebu.Core.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace NeoCebu.Infrastructure.Services;

public class VideoService : IVideoService
{
    private readonly IConfiguration _configuration;

    public VideoService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<VideoRoomResponse> GetRoomAccessAsync(Guid classroomId, string userId)
    {
        // Use a consistent, unique room name for this classroom
        // We add a prefix to prevent collisions with other Jitsi users
        string roomName = $"NeoCebu_SecureVLE_{classroomId:N}";
        
        return Task.FromResult(new VideoRoomResponse(
            roomName,
            Guid.NewGuid().ToString("N"), // Jitsi public doesn't require complex tokens
            "https://meet.jit.si" // Use official public Jitsi instance
        ));
    }

    private string GenerateSecureRoomToken(string roomName, string userId)
    {
        // Simulated token generation for a WebRTC provider
        var payload = $"{roomName}:{userId}:{DateTime.UtcNow.Ticks}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToBase64String(hash);
    }
}
