using Microsoft.AspNetCore.Identity;

namespace NeoCebu.Core.Entities;

public class ApplicationUser : IdentityUser
{
    public bool IsStudent { get; set; }
    public string? QrPayload { get; set; }
    public DateTime? LastSeen { get; set; }
    
    // Virtual classrooms this user is enrolled in
    public ICollection<ClassroomEnrollment> Enrollments { get; set; } = new List<ClassroomEnrollment>();
}

public class Classroom
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TeacherId { get; set; } = string.Empty;
    public ApplicationUser Teacher { get; set; } = null!;
    
    public ICollection<ClassroomEnrollment> Students { get; set; } = new List<ClassroomEnrollment>();
}

public class ClassroomEnrollment
{
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;
    
    public string StudentId { get; set; } = string.Empty;
    public ApplicationUser Student { get; set; } = null!;
    
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
}

public class ChatMessage
{
    public long Id { get; set; }
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;
    
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    
    public string Text { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public bool IsTeacher { get; set; }

    // File support
    public bool IsFile { get; set; } = false;
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
}

public class BlackboardItem
{
    public Guid Id { get; set; }
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;
    
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
