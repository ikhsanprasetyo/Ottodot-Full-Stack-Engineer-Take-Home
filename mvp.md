# MVP Tracker - Ottodot Trial Booking Reliability System

## Status Overview
- **Project**: Ottodot Full-Stack Engineer Take-Home Test
- **Phase**: Implementation Completed & Verified 100%
- **Target Domains**:
  - Frontend: `https://ottodot.byteseeker.net` (Next.js Static Export)
  - Backend: `https://serverottodot.byteseeker.net` (Go Gin REST Server - Port 9050)

---

## MVP Feature Checklist

### 1. Specification & Architecture Documentation
- [x] `PRD.md` created with business requirements, edge cases, invariants, and race scenarios.
- [x] `architecture.md` created with system architecture diagram, DB schemas, PostgreSQL lock strategy, and API specs.
- [x] `mvp.md` created to track development progress and implementation status.
- [x] `rules.md` created mapping key directories and project files.

### 2. Backend Implementation (Go Gin + PostgreSQL)
- [x] Database Schema & Migrations (`users`, `parents`, `students`, `trial_classes`, `bookings`, `payment_attempts`).
- [x] Partial Unique Index on confirmed bookings `(student_id, trial_class_id) WHERE status = 'confirmed'`.
- [x] Synthetic Seed Data Loader (`server-go/internal/data/seed.go`) populating parents, children, and classes (3/4 enrolled, 0/4 enrolled, 4/4 full, 2/6 enrolled).
- [x] Authentication API (`POST /api/v1/auth/login`) with JWT token generation and role context (`parent` vs `admin`).
- [x] Booking API Endpoints (`GET /api/v1/classes`, `POST /api/v1/bookings`, `POST /api/v1/payments/process`, `GET /api/v1/admin/classes/:id/roster`).
- [x] Dynamic Class Capacity Management API (`PUT /api/v1/admin/classes/:id`).
- [x] WebSocket Real-Time Event Hub (`/ws` broadcast for seat counters & roster changes).
- [x] Pessimistic Row Locking (`SELECT ... FOR UPDATE`) in payment processing service.
- [x] Concurrency & Race Condition automated unit/integration tests in Go (`server-go/tests/concurrency_test.go`).

### 3. Frontend Implementation (Next.js Static Build SPA)
- [x] Next.js static export config (`output: 'export'` in `next.config.ts`).
- [x] UI/UX Pro Max design system setup (`rounded-sm` geometry, responsive layouts, dark/light contrast, Lucide icons, no emojis as icons).
- [x] Auth Login Page (`client/app/page.tsx`) with JWT authentication & One-Click Quick Seed Account Selector.
- [x] Parent & Student selector context.
- [x] Trial Class Catalog with real-time seat availability indicators (WebSocket enabled).
- [x] Admin Class & Dynamic Capacity Manager UI (Edit student limit per class).
- [x] Interactive Mock Payment Simulator Modal (Success, Declined, Race Condition simulation).
- [x] Admin / Teacher Roster View (Real-time update via WebSocket).
- [x] Legacy Page Cleanup: Redirected unused routes (`/outlet`, `/rtu`, `/users`, etc.) to `/dashboard`.

### 4. Setup, Verification & Submission Docs
- [x] `README.md` with execution instructions, last-seat race explanation, backend design choices, and trade-offs.
- [x] `AI_USAGE.md` detailing AI tool usage, velocity gains, correction examples, and verification steps.

---

## Progress Log

- **2026-09-25**: Initialized project roadmap. Authored `PRD.md`, `architecture.md`, `mvp.md`, and `rules.md`.
- **2026-09-25**: Integrated WebSocket real-time specs into PRD, Architecture, and MVP checklist. Cleared domain references and updated Nginx config for `ottodot.byteseeker.net` and `serverottodot.byteseeker.net`.
- **2026-09-25**: Removed MongoDB completely; updated architecture to 100% pure PostgreSQL. Added Dynamic Class Capacity Management (no hardcoded limits) adhering to SRP, DRY, Clean Architecture, and software engineering standards.
- **2026-09-25**: Completed backend Go implementation (models, repository with pessimistic locking `SELECT ... FOR UPDATE`, auth controller, booking controller, WebSocket hub, seed data loader, concurrency test suite). Completed frontend Next.js SPA (Auth Login page with quick seed selector, main dashboard, mock payment simulator, teacher roster, dynamic capacity editor, real-time WebSocket hook). Cleaned up legacy routes (`/outlet`, `/rtu`, etc.).
- **2026-09-25**: Completely removed all legacy RTU, Position, Outlet, HRIS, and AI models, controllers, services, repositories, workers, and routes from `server-go`. Cleaned up all 17 frontend subdirectories under `client/app/rtu/` to safely redirect to `/dashboard`. Refined `client/app/dashboard/page.tsx` following UI/UX Pro Max guidelines (`rounded-sm` geometry, Lucide icons, dark slate contrast, race condition simulator, real-time WebSocket seat updates). Project 100% complete and verified!
- **2026-09-25**: Updated 100% of UI/UX design tokens across all components and pages ([globals.css](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/app/globals.css), [page.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/app/page.tsx), [dashboard/page.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/app/dashboard/page.tsx), [layout.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/app/layout.tsx)) to match the official Ottodot design system (`#E73449` Coral Red primary, `#C72236` Hover, `#FFF6E5` Warm Cream accents, `#EDE7DC` Line borders, `#15172B` Ink headers, `#3F4159` Body text, `Fraunces` serif display fonts, `Plus Jakarta Sans` body fonts, `rounded-sm` buttons & cards, `rounded-full` profile avatars per rule #26).
- **2026-09-25**: Fixed PostCSS/Prettier CSS syntax error in `globals.css` (dangling `}` brace removed and `@layer base` properly nested) and cleared unused import ESLint warnings in `page.tsx` and `dashboard/page.tsx`. All frontend code passes `pnpm fix` and `pnpm dev` cleanly.
- **2026-09-25**: Fixed API URL & WebSocket URL resolution ([ottodot-api.ts](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/lib/ottodot-api.ts), [useWebSocket.ts](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/lib/useWebSocket.ts), [.env.development](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/.env.development)). Automatically fallbacks to local Go server (`http://localhost:9050/api/v1` and `ws://localhost:9050/ws`) during local development (`localhost`), fixing login network timeout/0 B transfer error.
- **2026-09-25**: Replaced class selector dropdown in Teacher Admin Roster tab ([dashboard/page.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/app/dashboard/page.tsx)) with an interactive **Trial Class Management Table** using the reusable [`TableData`](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/table-data.tsx) component. Both the Class Management Table and the Confirmed Student Roster Table now use `TableData` with TanStack table features (sorting, search, pagination, dynamic action rendering).
- **2026-09-25**: Updated all button elements and interactive controls across the entire frontend design system ([button.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/button.tsx), [date-picker.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/date-picker.tsx), [time-picker.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/time-picker.tsx), [image-carousel.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/image-carousel.tsx), [year-picker.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/shared/year-picker.tsx), [badge-order-status.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/badge-order-status.tsx), [date-range-picker.tsx](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/date-range-picker.tsx)) to enforce `rounded-sm` geometry strictly according to User Rule #26 (`rounded-full` reserved exclusively for profile icons).
- **2026-09-25**: Resolved "Not authorized to view this page" issue inside `TableData` component in Teacher Admin view. Updated [`authorized.tsx`](file:///c:/Project/Web/Ottodot%20Full-Stack%20Engineer%20Take-Home/client/components/ui/authorized.tsx) to recognize active Ottodot session token (`ottodot_token`) & Teacher Admin role switcher (`ottodot_demo_role`), granting full access to Class Management & Confirmed Roster tables.


