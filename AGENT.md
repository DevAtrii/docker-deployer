# Agent Project Summary: Docker Deployer

## 🚀 Overview
Docker Deployer is a full-stack administration panel for managing Docker containers, images, and files via a multi-tenant web interface. It allows administrators to create users with specific resource quotas (CPU, RAM, Storage) and provides users with a simplified dashboard to deploy and monitor their own instances.

## 🛠 Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, Lucide React (Icons), React Query (State & Polling).
- **Backend**: Python Flask, Flask-CORS, PyJWT.
- **Docker**: Docker SDK for Python (interacting with local/remote Docker daemon).
- **Storage**: JSON-based file persistence for user metadata and registry tokens.

## 📁 File Structure
```text
docker-deployer/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login & Setup flows
│   ├── (dashboard)/        # Main application layout
│   │   ├── admin/          # Admin management panel
│   │   ├── containers/     # Container list & deploy
│   │   ├── dashboard/      # Personalized user summary
│   │   ├── files/          # Volume/File explorer
│   │   └── images/         # Registry & Image management
│   └── layout.tsx          # Shared navigation & Global UI
├── backend/                # Flask API
│   ├── data/
│   │   └── repositories/   # JSON & Docker SDK implementations
│   ├── domain/
│   │   ├── entities/       # User & Resource models
│   │   ├── interfaces/     # Repository abstractions
│   │   └── use_cases/      # Core business logic (Container, Auth, etc)
│   ├── presentation/
│   │   ├── middleware/     # JWT & Admin role checks
│   │   └── routes/         # REST endpoints
│   └── run.py              # Backend entry point
├── components/             # Reusable UI components (Card, Modal, etc)
└── src/                    # Frontend core logic
    ├── data/               # Axios API client
    ├── domain/             # TypeScript interfaces
    └── useCases/           # React Query hooks & Logic
```

## 🌟 Key Accomplishments (This Session)

### 1. Visual Feedback & UX
- **Universal Loaders**: Integrated loading spinners and status text for every container action (Start, Stop, Pause, Resume, Delete).
- **File UX**: Added loading states for file/folder deletions in the File explorer.

### 2. "Fetch & Redeploy" Workflow
- **Image Refreshing**: Users can now trigger a redeploy that pulls the latest version of an existing image (even if the tag remains the same) and restarts the container.
- **Config Persistence**: The system automatically captures existing port mappings, volume binds, and resource limits to ensure the fresh container matches the old one perfectly.
- **Progress Modal**: A dedicated modal shows real-time Docker pull logs and deployment phases.

### 3. Advanced Resource Management
- **Tenant Quotas**: Admins can now set specific **CPU vCPU limits** and **RAM limits (MB)** for each user.
- **Personalized Dashboard**: Users see their remaining/allowed resources on their dashboard, rather than global system stats.
- **Per-Container Limits**: Added inputs for CPU, RAM, and Swap RAM during deployment.
- **Automatic Enforcement**: The system validates that container limits do not exceed the user's account quota.

### 4. Real-time Monitoring
- **Usage Bars**: Container cards now feature **CPU and RAM usage bars** that update every 5 seconds.
- **Calculated Stats**: Implemented Docker-specific algorithms to calculate vCPU core usage from raw delta stats.

### 5. Admin Utilities
- **User Impersonation**: Admins can "View as User" to troubleshoot specific tenant environments, featuring a persistent sticky banner to manage the session.

---

## 🤖 Guide for Future AI Agents

### Core Patterns
- **API Communication**: All frontend logic should go through `src/useCases/hooks.ts` using React Query. Avoid calling the `apiClient` directly inside components.
- **Docker Interactions**: Perform all Docker logic in `backend/data/repositories/docker_repository.py`. Business constraints go in `backend/domain/use_cases/ContainerUseCases.py`.
- **Resource Validation**: When adding new deploy features, always check `user` object limits fetched from the repository to prevent tenant over-provisioning.
- **State Polling**: Use React Query `refetchInterval` for real-time updates (logs, stats). The current standard is 1s for task logs and 5s for resource stats.

### Design Principles
- **Aesthetics**: Maintain the premium "Dark/Glassmorphism" look using the `Card` and `Modal` components. Use `lucide-react` for all iconography.
- **Feedback**: Never perform a mutation without showing a loading state. Users should always know "what" is happening (e.g., "Pulling image...", "Stopping container...").

### Security
- Every backend route must be wrapped with `@token_required(auth_use_cases)`.
- Use `@admin_required()` specifically for routes under `backend/presentation/routes/admin_routes.py`.
- Container names are prefixed with `dd_{user_id}_` for strict namespace isolation. NEVER remove this prefix logic.
