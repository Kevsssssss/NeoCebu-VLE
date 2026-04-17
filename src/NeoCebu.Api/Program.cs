using Microsoft.AspNetCore.Authorization;
using NeoCebu.Api.Authorization;
using NeoCebu.Api.Hubs;
using NeoCebu.Api.Middleware;
using NeoCebu.Core.Entities;
using NeoCebu.Core.Interfaces;
using NeoCebu.Infrastructure.Data;
using NeoCebu.Infrastructure.Services;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSignalR();

// CORS Configuration
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReact", policy => {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Application Services
builder.Services.AddScoped<ITeacherService, TeacherService>();
builder.Services.AddScoped<IVideoService, VideoService>();

// Database Configuration
builder.Services.AddDbContext<NeoCebuDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity Configuration
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options => {
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 4;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<NeoCebuDbContext>()
.AddDefaultTokenProviders();

// JWT Authentication Configuration
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options => {
    options.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };

    // SignalR: Get token from query string for WebSockets
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chatHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Classroom Authorization Policy
builder.Services.AddScoped<IAuthorizationHandler, ClassroomAuthorizationHandler>();
builder.Services.AddAuthorization(options => {
    options.AddPolicy("ClassroomPolicy", policy => 
        policy.Requirements.Add(new ClassroomRequirement()));
});

var app = builder.Build();

// Automated Database Initialization for local environment
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NeoCebuDbContext>();
    db.Database.EnsureCreated();
    
    // Manual Migration for ChatMessages if not exists
    var conn = db.Database.GetDbConnection();
    bool tableExists = false;
    try {
        if (conn.State != System.Data.ConnectionState.Open) conn.Open();
        using (var cmd = conn.CreateCommand()) {
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='ChatMessages';";
            var result = cmd.ExecuteScalar();
            tableExists = result != null;
        }
        
        if (!tableExists) {
            using (var cmd = conn.CreateCommand()) {
                cmd.CommandText = @"
                    CREATE TABLE ChatMessages (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ClassroomId TEXT NOT NULL,
                        UserId TEXT NOT NULL,
                        Text TEXT NOT NULL,
                        Timestamp TEXT NOT NULL,
                        IsTeacher INTEGER NOT NULL,
                        IsFile INTEGER NOT NULL DEFAULT 0,
                        FileName TEXT,
                        FileUrl TEXT,
                        FOREIGN KEY(ClassroomId) REFERENCES Classrooms(Id) ON DELETE CASCADE,
                        FOREIGN KEY(UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE
                    );";
                cmd.ExecuteNonQuery();
            }
        } else {
            // Check if new columns exist (simple migration)
            using (var cmd = conn.CreateCommand()) {
                cmd.CommandText = "PRAGMA table_info(ChatMessages);";
                var columns = new List<string>();
                using (var reader = cmd.ExecuteReader()) {
                    while (reader.Read()) columns.Add(reader["name"].ToString()!);
                }
                
                if (!columns.Contains("IsFile")) {
                    using (var cmdAlter = conn.CreateCommand()) {
                        cmdAlter.CommandText = "ALTER TABLE ChatMessages ADD COLUMN IsFile INTEGER NOT NULL DEFAULT 0;";
                        cmdAlter.ExecuteNonQuery();
                    }
                }
                if (!columns.Contains("FileName")) {
                    using (var cmdAlter = conn.CreateCommand()) {
                        cmdAlter.CommandText = "ALTER TABLE ChatMessages ADD COLUMN FileName TEXT;";
                        cmdAlter.ExecuteNonQuery();
                    }
                }
                if (!columns.Contains("FileUrl")) {
                    using (var cmdAlter = conn.CreateCommand()) {
                        cmdAlter.CommandText = "ALTER TABLE ChatMessages ADD COLUMN FileUrl TEXT;";
                        cmdAlter.ExecuteNonQuery();
                    }
                }
            }
        }

        // Manual Migration for BlackboardItems
        bool blackboardExists = false;
        using (var cmd = conn.CreateCommand()) {
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='BlackboardItems';";
            var result = cmd.ExecuteScalar();
            blackboardExists = result != null;
        }

        if (!blackboardExists) {
            using (var cmd = conn.CreateCommand()) {
                cmd.CommandText = @"
                    CREATE TABLE BlackboardItems (
                        Id TEXT PRIMARY KEY,
                        ClassroomId TEXT NOT NULL,
                        Title TEXT NOT NULL,
                        Description TEXT NOT NULL,
                        FileName TEXT,
                        FileUrl TEXT,
                        CreatedAt TEXT NOT NULL,
                        FOREIGN KEY(ClassroomId) REFERENCES Classrooms(Id) ON DELETE CASCADE
                    );";
                cmd.ExecuteNonQuery();
            }
        }
    } finally {
        // Connection is managed by EF but we should be careful
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Ensure static files work even if WebRootPath was null initially
var webRootPath = app.Environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
if (!Directory.Exists(webRootPath)) Directory.CreateDirectory(webRootPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(webRootPath),
    RequestPath = ""
});

app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<SessionTimeoutMiddleware>();

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();
