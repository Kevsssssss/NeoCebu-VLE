using NeoCebu.Core.DTOs;

namespace NeoCebu.Core.Interfaces;

public interface IVideoService
{
    Task<VideoRoomResponse> GetRoomAccessAsync(Guid classroomId, string userId);
}
