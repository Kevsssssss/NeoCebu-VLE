using Ganss.Xss;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Infrastructure.Data;
using NeoCebu.Core.Entities;
using System.Security.Claims;

namespace NeoCebu.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly NeoCebuDbContext _dbContext;
    private readonly HtmlSanitizer _sanitizer;
    
    // Track online users: ClassroomId -> HashSet of UserIds
    private static readonly Dictionary<string, HashSet<string>> OnlineUsers = new();
    // Track connection to classroom mapping: ConnectionId -> ClassroomId
    private static readonly Dictionary<string, string> ConnectionToClassroom = new();
    // Track active video sessions: ClassroomId
    private static readonly HashSet<string> ActiveVideoSessions = new();

    public ChatHub(NeoCebuDbContext dbContext)
    {
        _dbContext = dbContext;
        _sanitizer = new HtmlSanitizer();
    }

    public static bool IsUserOnline(string classroomId, string userId)
    {
        lock (OnlineUsers)
        {
            return OnlineUsers.TryGetValue(classroomId, out var users) && users.Contains(userId);
        }
    }

    public async Task JoinClassroom(string classroomIdStr)
    {
        if (!Guid.TryParse(classroomIdStr, out var classroomId))
        {
            throw new HubException("Invalid classroom ID.");
        }

        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) throw new HubException("Unauthorized.");

        // Zero Trust: Verify enrollment before allowing to join the SignalR group
        var isAuthorized = await _dbContext.Classrooms
            .AnyAsync(c => c.Id == classroomId && 
                           (c.TeacherId == userId || 
                            c.Students.Any(s => s.StudentId == userId)));

        if (!isAuthorized)
        {
            throw new HubException("You are not authorized to access this classroom chat.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, classroomIdStr);
        
        lock (OnlineUsers)
        {
            if (!OnlineUsers.ContainsKey(classroomIdStr))
            {
                OnlineUsers[classroomIdStr] = new HashSet<string>();
            }
            OnlineUsers[classroomIdStr].Add(userId);
            ConnectionToClassroom[Context.ConnectionId] = classroomIdStr;
        }

        await Clients.Group(classroomIdStr).SendAsync("UserStatusChanged", userId, true);
        
        // Notify the joining user if a video call is already active
        lock (ActiveVideoSessions)
        {
            if (ActiveVideoSessions.Contains(classroomIdStr))
            {
                Clients.Caller.SendAsync("VideoCallStatusChanged", true);
            }
        }
    }

    public async Task StartVideoSession(string classroomIdStr)
    {
        Console.WriteLine($"[DEBUG] StartVideoSession called for classroom: {classroomIdStr}");
        
        if (!Guid.TryParse(classroomIdStr, out var classroomId))
        {
            Console.WriteLine($"[DEBUG] Invalid classroom ID: {classroomIdStr}");
            throw new HubException("Invalid classroom ID.");
        }

        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Debug: List all claims to find the correct one
        foreach (var claim in Context.User?.Claims ?? [])
        {
            Console.WriteLine($"[DEBUG] Claim: {claim.Type} = {claim.Value}");
        }

        var isStudentClaim = Context.User?.FindFirst("is_student")?.Value 
                           ?? Context.User?.FindFirst(c => c.Type.EndsWith("is_student"))?.Value;
        
        bool isTeacher = isStudentClaim == "false";

        Console.WriteLine($"[DEBUG] User: {userId}, isStudentClaim: '{isStudentClaim}', IsTeacher: {isTeacher}");

        if (!isTeacher) 
        {
            Console.WriteLine($"[DEBUG] Access denied: User is not a teacher.");
            throw new HubException("Only teachers can start video sessions.");
        }

        lock (ActiveVideoSessions)
        {
            ActiveVideoSessions.Add(classroomIdStr);
        }

        Console.WriteLine($"[DEBUG] Video session started for {classroomIdStr}. Notifying group.");

        await Clients.Group(classroomIdStr).SendAsync("VideoCallStatusChanged", true);
        await Clients.Group(classroomIdStr).SendAsync("ReceiveMessage", "System", "A teacher has started a video call.", true, "system", false, null, null);
    }

    public async Task EndVideoSession(string classroomIdStr)
    {
        var isStudentClaim = Context.User?.FindFirst("is_student")?.Value;
        bool isTeacher = isStudentClaim == "false";

        if (!isTeacher) throw new HubException("Only teachers can end video sessions.");

        lock (ActiveVideoSessions)
        {
            ActiveVideoSessions.Remove(classroomIdStr);
        }

        await Clients.Group(classroomIdStr).SendAsync("VideoCallStatusChanged", false);
    }

    public async Task SendMessage(string classroomIdStr, string message, bool isFile = false, string? fileName = null, string? fileUrl = null)
    {
        if (!Guid.TryParse(classroomIdStr, out var classroomId)) return;

        // XSS Prevention: Sanitize input (only if it's text)
        var sanitizedMessage = isFile ? "" : _sanitizer.Sanitize(message);
        var userName = Context.User?.Identity?.Name ?? "Anonymous";
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        
        var isStudentClaim = Context.User?.FindFirst("is_student")?.Value;
        bool isTeacher = isStudentClaim == "false";

        // Persistence: Save to DB
        _dbContext.ChatMessages.Add(new ChatMessage
        {
            ClassroomId = classroomId,
            UserId = userId,
            Text = sanitizedMessage,
            IsTeacher = isTeacher,
            Timestamp = DateTime.UtcNow,
            IsFile = isFile,
            FileName = fileName,
            FileUrl = fileUrl
        });
        await _dbContext.SaveChangesAsync();

        // Room Isolation: Only send to the specific classroom group
        await Clients.Group(classroomIdStr).SendAsync("ReceiveMessage", userName, sanitizedMessage, isTeacher, userId, isFile, fileName, fileUrl);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string? classroomId = null;
        string? userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        lock (OnlineUsers)
        {
            if (ConnectionToClassroom.TryGetValue(Context.ConnectionId, out classroomId))
            {
                ConnectionToClassroom.Remove(Context.ConnectionId);
                if (userId != null && OnlineUsers.TryGetValue(classroomId, out var users))
                {
                    users.Remove(userId);
                    if (users.Count == 0)
                    {
                        OnlineUsers.Remove(classroomId);
                    }
                }
            }
        }

        if (classroomId != null && userId != null)
        {
            await Clients.Group(classroomId).SendAsync("UserStatusChanged", userId, false);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
