# Development Log: Neo-Cebu 2026 Security Framework

## Date: 2026-04-16
### Initial Setup
- **Action:** Processed `Master Prompt.txt`.
- **Status:** Project Completed.
- **Final Actions:**
    - Implemented Teacher Account Registration with `AdminSecret` protection.
    - Verified full solution build with .NET 10.
    - Fixed namespace and variable initialization issues during build verification.
    - Confirmed all security framework requirements (QR Auth, Zero Trust, SignalR XSS, Timeout) are integrated.
- **Status:** Full System Completed.
- **Frontend Actions:**
    - Initialized Vite/React project with TypeScript.
    - Implemented "Hydra-Shield" design system (Navy/Cyan/Slate).
    - Built `AuthContext` with JWT decoding and session persistence.
    - Implemented `StudentLoginPage` (QR payload) and `RegisterPage` (Admin Secret).
    - Developed `Dashboard` with teacher-led provisioning and QR generation.
    - Created `ClassroomHub` with SignalR chat, video room console, and inactivity timer.
- **Integration:** 
    - Verified connectivity between React and ASP.NET Core API.
    - Confirmed real-time chat functionality over SignalR.

---

## Date: 2026-04-17
### System Enhancements & UI Redesign
- **Infrastructure & Connectivity:**
    - **Vite Proxy Implementation**: Configured Vite proxy to securely route `/api`, `/chatHub`, and `/uploads` to the backend, resolving "Mixed Content" security errors during local development.
    - **SSL Integration**: Added `@vitejs/plugin-basic-ssl` to serve the frontend via HTTPS, which is required by modern browsers to access the Camera for QR scanning on remote devices.
    - **Network Accessibility**: Configured both frontend (Vite `host: true`) and backend (API binding to `0.0.0.0`) to allow access from other devices on the same Wi-Fi network (e.g., Android students).
    - **Dynamic API Discovery**: Updated frontend to use `window.location.hostname` instead of hardcoded IPs, allowing seamless switching between local and remote network access.

- **QR Scanner Reliability:**
    - **Fixed Initialization Duplication**: Implemented a `useRef` and `setTimeout` (100ms delay) lifecycle guard to prevent multiple camera instances from spawning during React Strict Mode mounts and Hot Module Replacement (HMR).
    - **UI Visibility**: Added a `minHeight` to the scanner container to ensure the library renders the UI correctly on all screen sizes.

- **SaaS UI/UX Overhaul:**
    - **Global Redesign**: Migrated from the initial "neon" aesthetic to a sophisticated, token-based **SaaS Dark Theme** using the 'Syne' and 'DM Sans' typography.
    - **Icon Standardization**: Established a Tier-based icon system (Micro, Standard, Large, Hero) using Lucide-React for perfect visual balance across the app.
    - **Responsive Mobile Fixes**: Applied intelligent text truncation and responsive font scaling to the "People" tab and other data-heavy sections to prevent overflow on mobile devices.
    - **Modern Inputs**: Standardized all form inputs with clean borders, indigo focus rings, and proper mobile padding.

- **Classroom Hub Advanced Features:**
    - **Responsive Layout**: Rebuilt the hub with a desktop sidebar and a mobile-friendly bottom navigation bar.
    - **Persistent Video (PIP)**: Implemented a "Picture-in-Picture" style video container. The stream remains active and minimizes into a floating window when users switch to the People or Chat tabs.
    - **Jitsi External API Integration**: Migrated from a raw `iframe` to the official Jitsi External API for significantly higher connection reliability and better media stream handling.
    - **Auto-Fullscreen**: Added logic to automatically expand the video call to fullscreen on mobile devices when joining, fixing "black screen" issues on Android browsers.

- **Classroom Moderator & Logic:**
    - **Teacher-First Moderator Logic**: Implemented backend and frontend checks so that only teachers can officially start a video session. Students are blocked until the teacher is present.
    - **Real-time Call Notifications**: Added SignalR broadcasting so students receive an instant alert and a system chat message the moment a teacher starts a video call.

- **Security & Timer Logic:**
    - **Context-Aware Inactivity**: Re-engineered the session timer to be smarter. It now waits for **1 minute of absolute idleness** (no mouse/touch/keys) before the 10-minute countdown starts.
    - **Automatic Session Termination**: Verified and fixed the "Auto-Kick" logic. The user is now securely logged out and redirected to the login page immediately when the timer reaches 0.
    - **Minimalist Timer UI**: The session timer now stays hidden and only "pops up" once 30 seconds of inactivity has been detected.

- **Blackboard Feature Implementation:**
    - **Educational Materials Storage**: Added the `BlackboardItem` entity and database table for permanent storage of classroom materials and assignments.
    - **Teacher Upload Portal**: Integrated a posting interface allowing teachers to attach files, titles, and descriptions directly to the classroom "Blackboard."
    - **Student Download Access**: Created a card-based library where students can view and download files posted by their teachers.

---
**Current solution is build-ready and network-optimized.**
