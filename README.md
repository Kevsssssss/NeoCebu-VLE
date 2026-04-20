# Neo-Cebu 2026: Secure Virtual Learning Environment

Neo-Cebu 2026 is a high-security, context-aware Virtual Learning Environment (VLE) designed for modern educational resilience. Built with a **Zero Trust** architecture, it features password-less student authentication via encrypted QR payloads, real-time SignalR communication, and integrated secure video conferencing.

## 🚀 Key Features

- **Zero Trust Security**: Context-aware classroom isolation ensures that only authorized students and teachers can access specific modules.
- **QR-Based Authentication**: Students log in using teacher-provisioned, encrypted physical ID payloads—eliminating the need for vulnerable passwords.
- **Real-Time Blackboard**: A dedicated portal for teachers to post assignments and materials, and for students to securely download them.
- **Secure Video Conferencing**: Integrated Jitsi Meet External API with automatic mobile fullscreen support and teacher-led moderator logic.
- **Persistent Chat**: Real-time SignalR chat with aggressive XSS sanitization and E2E-style visual indicators.
- **Intelligent Session Management**: Context-aware inactivity timers that automatically terminate sessions after periods of absolute idleness.
- **Responsive SaaS UI**: A modern, dark-themed professional interface optimized for both desktop and mobile (Android/iOS) devices.

## 🛠 Tech Stack

- **Backend**: ASP.NET Core 10, Entity Framework Core, SQLite, SignalR, JWT Authentication.
- **Frontend**: React 18, Vite, TypeScript, Lucide Icons.
- **Tools**: Html5-Qrcode, Jitsi Meet API, Axios.

## 📂 Project Structure

```text
C:\NeoCebu-VLE\
├── src/
│   ├── NeoCebu.Api/             # ASP.NET Core Web API project (Endpoints & Hubs)
│   │   ├── Controllers/         # API Controllers for Auth, Admin, and Classrooms
│   │   ├── Hubs/                # SignalR Hubs for real-time chat and signaling
│   │   └── Middleware/          # Custom security & session timeout middleware
│   ├── NeoCebu.Core/            # Core business logic, Entities, and Interfaces
│   │   ├── Entities/            # Database models (User, Classroom, Chat, etc.)
│   │   └── DTOs/                # Data Transfer Objects for API contracts
│   ├── NeoCebu.Infrastructure/  # Data access and external service implementations
│   │   ├── Data/                # Entity Framework DbContext and Migrations
│   │   └── Services/            # Business service implementations
│   └── NeoCebu.Web/             # React (Vite) Frontend application
│       ├── src/pages/           # Main UI views (Landing, Auth, Dashboard, Classroom)
│       ├── src/context/         # Authentication and Global state providers
│       └── src/hooks/           # Custom React hooks (e.g., SignalR integration)
└── tests/                       # Unit and Integration test projects
```

## 🏁 Getting Started

### Prerequisites
- .NET 10.0 SDK
- Node.js (LTS)

### Backend Setup
1. Navigate to the API directory: `cd src/NeoCebu.Api`
2. Start the API: `dotnet run`
   - The API will bind to `http://0.0.0.0:5197` to allow local network access.

### Frontend Setup
1. Navigate to the Web directory: `cd src/NeoCebu.Web`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
   - The frontend will be served via HTTPS on port `5173`.
   - Access from mobile using `https://<YOUR_IP>:5173`.

### Default Admin Account
- **Username**: admin@neocebu.com
- **Password**: Admin123!

## 🛡 Security Protocols

- **Admin Secret**: Educator registration is protected by an institutional master key.
- **Moderator Logic**: Video streams can only be initiated by verified teachers.
- **Local Proxy**: Vite proxying prevents Mixed Content errors and hides backend infrastructure from direct browser exposure.

---
© 2026 Neo-Cebu Security Framework. Designed for public education resilience.
