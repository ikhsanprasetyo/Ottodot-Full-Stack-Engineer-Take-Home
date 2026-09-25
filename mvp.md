# MVP Tracker - Ottodot Trial Booking Reliability System

## Status Overview
- **Project**: Ottodot Full-Stack Engineer Take-Home Test
- **Phase**: Design & Architecture Complete -> Implementation Phase
- **Target Domains**:
  - Frontend: `https://ottodot.byteseeker.net` (Next.js Static Export)
  - Backend: `https://serverottodot.byteseeker.net` (Go Gin REST Server)

---

## MVP Feature Checklist

### 1. Specification & Architecture Documentation
- [x] `PRD.md` created with business requirements, edge cases, invariants, and race scenarios.
- [x] `architecture.md` created with system architecture diagram, DB schemas, PostgreSQL lock strategy, and API specs.
- [x] `mvp.md` created to track development progress and implementation status.
- [x] `rules.md` created mapping key directories and project files.

### 2. Backend Implementation (Go Gin + PostgreSQL)
- [ ] Database Schema & Migrations (`parents`, `students`, `trial_classes`, `bookings`, `payment_attempts`).
- [ ] Partial Unique Index on confirmed bookings `(student_id, trial_class_id) WHERE status = 'confirmed'`.
- [ ] Seed Data Loader (Classes with dynamic capacities 4, 6, 2; Parents & Students).
- [ ] Booking API Endpoints (`GET /api/v1/classes`, `POST /api/v1/bookings`, `POST /api/v1/payments/process`, `GET /api/v1/admin/classes/:id/roster`).
- [ ] Dynamic Class Capacity Management API (`POST /api/v1/admin/classes`, `PUT /api/v1/admin/classes/:id`).
- [ ] WebSocket Real-Time Event Hub (`/ws` broadcast for seat counters & roster changes).
- [ ] Pessimistic Row Locking (`SELECT ... FOR UPDATE`) in payment processing service.
- [ ] Concurrency & Race Condition automated unit/integration tests in Go.

### 3. Frontend Implementation (Next.js Static Build SPA)
- [ ] Next.js static export config (`output: 'export'`).
- [ ] UI/UX Pro Max design system setup (`rounded-sm`, responsive layouts, dark/light contrast, no emojis as icons).
- [ ] Parent & Student selector context.
- [ ] Trial Class Catalog with real-time seat availability indicators (WebSocket enabled).
- [ ] Admin Class & Dynamic Capacity Manager UI (Edit student limit per class).
- [ ] Interactive Mock Payment Simulator Modal (Success, Declined, Race Condition simulation).
- [ ] Admin / Teacher Roster View (Real-time update via WebSocket).

### 4. Setup, Verification & Submission Docs
- [ ] `README.md` with execution instructions, last-seat race explanation, backend design choices, and trade-offs.
- [ ] `AI_USAGE.md` detailing AI tool usage, velocity gains, correction examples, and verification steps.

---

## Progress Log

- **2026-09-25**: Initialized project roadmap. Authored `PRD.md`, `architecture.md`, `mvp.md`, and `rules.md`.
- **2026-09-25**: Integrated WebSocket real-time specs into PRD, Architecture, and MVP checklist. Cleared domain references and updated Nginx config for `ottodot.byteseeker.net` and `serverottodot.byteseeker.net`.
- **2026-09-25**: Removed MongoDB completely; updated architecture to 100% pure PostgreSQL. Added Dynamic Class Capacity Management (no hardcoded limits) adhering to SRP, DRY, Clean Architecture, and software engineering standards. Next step: Backend Go GORM/Postgres models & concurrency service implementation.
