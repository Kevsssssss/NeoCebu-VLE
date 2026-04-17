using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NeoCebu.Core.Interfaces;
using System.Security.Claims;

namespace NeoCebu.Api.Controllers;

[ApiController]
[Authorize(Policy = "ClassroomPolicy")]
[Route("api/[controller]")]
public class VideoController : ControllerBase
{
    private readonly IVideoService _videoService;

    public VideoController(IVideoService videoService)
    {
        _videoService = videoService;
    }

    [HttpGet("{classroomId}/access")]
    public async Task<IActionResult> GetVideoAccess(Guid classroomId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var response = await _videoService.GetRoomAccessAsync(classroomId, userId);
        return Ok(response);
    }
}
