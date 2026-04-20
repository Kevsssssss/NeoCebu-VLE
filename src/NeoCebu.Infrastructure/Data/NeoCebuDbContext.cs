using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NeoCebu.Core.Entities;

namespace NeoCebu.Infrastructure.Data;

public class NeoCebuDbContext : IdentityDbContext<ApplicationUser>
{
    public NeoCebuDbContext(DbContextOptions<NeoCebuDbContext> options) : base(options) { }

    public DbSet<Classroom> Classrooms { get; set; } = null!;
    public DbSet<ClassroomEnrollment> Enrollments { get; set; } = null!;
    public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
    public DbSet<BlackboardItem> BlackboardItems { get; set; } = null!;
    public DbSet<SystemSetting> SystemSettings { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure SystemSettings
        builder.Entity<SystemSetting>()
            .HasKey(s => s.Key);

        // Configure Many-to-Many via Join Entity
        builder.Entity<ClassroomEnrollment>()
            .HasKey(ce => new { ce.ClassroomId, ce.StudentId });

        builder.Entity<ClassroomEnrollment>()
            .HasOne(ce => ce.Classroom)
            .WithMany(c => c.Students)
            .HasForeignKey(ce => ce.ClassroomId);

        builder.Entity<ClassroomEnrollment>()
            .HasOne(ce => ce.Student)
            .WithMany(s => s.Enrollments)
            .HasForeignKey(ce => ce.StudentId);

        // Restrict teachers to one-to-many relationship with classrooms
        builder.Entity<Classroom>()
            .HasOne(c => c.Teacher)
            .WithMany()
            .HasForeignKey(c => c.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        // Chat Persistence
        builder.Entity<ChatMessage>()
            .HasOne(m => m.Classroom)
            .WithMany()
            .HasForeignKey(m => m.ClassroomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ChatMessage>()
            .HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Blackboard Configuration
        builder.Entity<BlackboardItem>()
            .HasOne(b => b.Classroom)
            .WithMany()
            .HasForeignKey(b => b.ClassroomId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
