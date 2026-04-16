# Agent Project Summary: Docker Deployer

## 🚀 Overview
Docker Deployer is a full-stack administration panel for managing Docker containers, images, and files via a multi-tenant web interface. It leverages a modern **shadcn/ui** design system to provide a premium, responsive, and accessible experience for both system administrators and end-users.

## 🛠 Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, Lucide React, `next-themes` (Dark Mode), `sonner` (Toasts).
- **Backend**: Python Flask, Flask-CORS, PyJWT.
- **Docker**: Docker SDK for Python.
- **State Management**: TanStack Query (React Query) for server state and polling.

## 📁 File Structure
```text
docker-deployer/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Main application layout grouping
│   │   ├── admin/          # Tenant & Quota management
│   │   ├── containers/     # Workload orchestration
│   │   ├── dashboard/      # Telemetry & Quota overview
│   │   ├── files/          # Persistent volume explorer
│   │   └── images/         # Registry & Pulled images
│   ├── login/              # Entry point
│   ├── setup/              # Instance initialization
│   ├── layout.tsx          # Root layout with Toaster & Theme
│   └── providers.tsx       # Global Context (QueryClient, Theme)
├── components/
│   ├── ui/                 # shadcn/ui low-level components
│   └── app-sidebar.tsx     # Floating, collapsible navigation
├── src/                    # Frontend infrastructure
│   ├── data/               # API clients
│   └── useCases/           # React Query hooks & business logic
└── backend/                # Python Core Logic (Domain-Driven Design)
```

## 🌟 Key Accomplishments (shadcn/ui Migration)

### 1. Modern Design System
- **shadcn/ui Integration**: Replaced all custom UI elements with standardized, accessible Radix-based components.
- **Dark Mode Support**: Full dark/light/system theme switching via `next-themes`.
- **Responsive Layout**: Implemented a floating, collapsible sidebar that transforms into a mobile `Sheet` for small screens.

### 2. Enhanced User Feedback
- **Sonner Toasts**: Replaced native browser alerts with consistent, non-blocking toast notifications.
- **Real-time Telemetry**: Improved CPU/RAM monitoring bars with smoother rendering and polling logic.
- **Progressive Pulling**: Detailed progress bars and log streams for Docker Registry operations.

### 3. Management & Control
- **Resource Quotas**: Visual badges for vCPU, RAM, and Storage limits throughout the interface.
- **Admin Control Center**: Deep inspection tools allowing admins to monitor and manage tenant workloads directly from a centralized table.
- **User Impersonation**: Seamless context switching for administrators to troubleshoot tenant environments.

---

## 🤖 Guide for Future AI Agents

### Core Patterns
- **Component Usage**: ALWAYS use `shadcn` components. If a component is missing, add it via `npx shadcn@latest add <component>`.
- **Navigation**: The navigation is managed in `components/app-sidebar.tsx`. Links must use the `Link` component from `next/link`.
- **API Framework**: All backend interactions must use the hooks defined in `src/useCases/hooks.ts`. Do not write raw `apiClient` calls in components.
- **Polling**: Container usage stats and logs use React Query `refetchInterval`. Adjust this locally if higher frequency is needed for specific debug sessions.

### Design Principles
- **Aesthetics**: Follow the "Premium Floating" aesthetic. Keep cards slightly transparent with subtle borders (`border-border/50`).
- **Icons**: Use `lucide-react` for all visual cues.
- **Loading States**: Every mutation mutation (e.g., stopping a container) must display an inline `Loader2` or a global toast.

### Security & Isolation
- **Tenant Prefixing**: Every user-owned container name is prefixed with `dd_{user_id}_`. This is critical for security and must never be refactored without updating the Python middle-layer.
- **Admin Protection**: Routes under `/admin` and related API endpoints are strictly guarded by role-based access control.
- **JWT Management**: Session tokens are stored in `localStorage`. Impersonation tokens are stored as `admin_token` for recovery.
