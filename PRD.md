# Product Requirements Document (PRD)
## Ottodot Trial Booking Reliability & Concurrency Engine

| Document Metadata | Details |
| :--- | :--- |
| **Project** | Ottodot Full-Stack Engineer Take-Home Test |
| **System** | Trial Booking, Seat Race Prevention & Dynamic Class Management System |
| **Target Deployment** | Frontend: `ottodot.byteseeker.net`<br>Backend: `serverottodot.byteseeker.net` |
| **Stack** | Next.js (Static Export, Full Client) + Go (Gin Framework) + PostgreSQL (Sole Database) |
| **Author** | Senior Full-Stack Engineer |
| **Status** | Approved / Production Specification |

---

## 1. Executive Summary & Context

Ottodot provides live online science and math classes for children. Parents discover and book trial classes for their children before committing to regular enrollment. To ensure high learning quality and interactive small group dynamics, **trial classes have configurable student capacity limits (default 4 students per class, dynamically adjustable per class by Administrators)**.

The core requirement of this system is **bulletproof data reliability under edge cases and concurrency**, built strictly following **Software Engineering Best Practices (SRP, DRY, Clean Architecture, High Portability, Zero Hardcoding, Scalability)**.

Under high demand or simultaneous bookings (e.g. multiple parents attempting to book the last remaining seat), the system guarantees that:
1. No class exceeds its dynamically configured capacity limit (**Overbooking Prevention**).
2. No child is booked twice for the same class (**Duplicate Booking Prevention**).
3. Failed payments never result in a confirmed seat (**Payment Failure Handling**).
4. In concurrent payment attempts for the last seat, exactly one parent secures the seat while the other receives a clear, deterministic failure message (**Last-Seat Race Condition Handling**).
5. Admins can dynamically edit the maximum student capacity per class via API/UI without code changes or restarts (**Dynamic Capacity Management**).
6. MongoDB is completely removed in favor of a unified, robust PostgreSQL 16 relational engine.

---

## 2. Target Persona & User Roles

### 2.1 Parent / Customer
- Selects a child profile (or creates one).
- Views available live science & math trial classes with real-time seat status (WebSocket powered).
- Initiates a trial booking (`pending_payment`).
- Executes a payment step (Simulated / Mock Payment Gateway).
- Receives immediate booking confirmation or detailed failure feedback.

### 2.2 Teacher / Administrator
- Configures trial class schedules, titles, subjects, and **dynamic student capacity limits** per class.
- Views real-time roster for any trial class.
- Verifies confirmed students, student ages, parent contact details, and current enrollment count against dynamic class capacity.

---

## 3. Scope & Non-Scope

### 3.1 In Scope
- **Trial Booking Lifecycle**: Creation (`pending_payment`), processing (`payment_processing`), confirmation (`confirmed`), failure (`payment_failed`), and expiration (`expired`).
- **Dynamic Class & Capacity Management (Admin)**: Create, view, update class details and edit max student capacity dynamically per class (NO hardcoding).
- **Child Selection**: Parent picking an existing child.
- **Dynamic Seat Limit Enforcement**: Capacity checked dynamically against `trial_classes.capacity` in PostgreSQL transactions.
- **Concurrency & Race Handling**: Strict database-level pessimistic locking (`SELECT ... FOR UPDATE`) and transactional integrity for the last available seat.
- **Duplicate Prevention**: Partial unique indexing on `(student_id, trial_class_id)` where `status = 'confirmed'`.
- **Payment Outcome Simulation**: Success & failure paths.
- **Real-Time WebSocket Updates**: Live WebSocket broadcast (`/ws`) for class seat counters and admin roster updates across all connected clients.
- **Admin/Teacher Roster API & View**: Visual display of students enrolled in a class.
- **Static Next.js Client + Go Gin REST API + PostgreSQL** (MongoDB completely removed).

### 3.2 Out of Scope
- Regular multi-week course enrollment.
- Real Stripe/PayPal API integration (Mock Payment Engine used for deterministic testing).
- Complex multi-factor authentication (Parent context is selected from synthetic seed dataset for fast testing).

---

## 4. Software Engineering Principles & System Invariants

### 4.1 Software Engineering Core Principles
1. **Single Responsibility Principle (SRP)**: Each Go package, controller, service, repository, and React component has one clearly defined responsibility.
2. **Don't Repeat Yourself (DRY)**: Reusable validation helpers, unified database transactional wrappers, and reusable UI components.
3. **Zero Hardcoding**: Capacity limits, timeout values, and API URLs are dynamic and configurable via DB/Environment.
4. **Scalability & Easy Maintenance**: Clean layered architecture (Controller $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ PostgreSQL) allowing seamless scaling and extensions.

### 4.2 Mathematical Invariants

```
[Invariant 1: Dynamic Seat Capacity]
COUNT(bookings WHERE trial_class_id = X AND status = 'confirmed') <= trial_classes[X].capacity

[Invariant 2: Single Active Booking per Child]
COUNT(bookings WHERE student_id = Y AND trial_class_id = X AND status = 'confirmed') <= 1

[Invariant 3: Payment Consistency]
status == 'confirmed' <=> payment_attempt.status == 'succeeded' AND seat_available_at_time_of_commit == true
```

---

## 5. Required Technical Scenarios & Edge Case Logic

### 5.1 Scenario A: Overbooking Prevention
- **Constraint**: `capacity = C` (dynamic per class `trial_classes.capacity`).
- If a class already has `C` confirmed students, any new booking attempt or payment submission MUST be rejected with a `409 Conflict` (Class Full) response.

### 5.2 Scenario B: Duplicate Confirmed Booking Prevention
- **Constraint**: A child cannot have 2 confirmed bookings in the same trial class.
- If Parent attempts to book Child C for Class K when Child C already has a confirmed booking for Class K, the system immediately rejects the creation or confirmation with `422 Unprocessable Entity` (Duplicate Booking).

### 5.3 Scenario C: Payment Failure Handling
- **Flow**: Parent initiates booking -> status = `pending_payment`.
- Parent triggers simulated payment with `outcome = "fail"`.
- Booking status updates to `payment_failed`.
- **Invariant**: Child is **NOT** added to the confirmed roster, and the seat remains available for other parents.

### 5.4 Scenario D: The Last-Seat Race Condition (CRITICAL)
- **Sequence of Events**:
  1. Class X has capacity `C = 4` and 3 confirmed students (1 seat remaining: `3/C`).
  2. **User A** selects Class X and initiates booking (`pending_payment`).
  3. **User B** selects Class X and initiates booking (`pending_payment`).
  4. Both User A and User B proceed to the payment step concurrently.
  5. **User B** completes payment submission first.
     - Backend opens SQL Transaction.
     - Locks `trial_classes WHERE id = X` via `SELECT ... FOR UPDATE`.
     - Reads `capacity` (`C`) and calculates confirmed count (`3/C`). Seat is available!
     - Updates User B booking status to `confirmed`.
     - Updates `trial_classes.enrolled_count` to 4.
     - Commits transaction. User B booking is **CONFIRMED**.
     - Broadcasts WebSocket event to all clients updating seat count to `0 seats left`.
  6. **User A** completes payment submission immediately after.
     - Backend opens SQL Transaction.
     - Acquires row lock `FOR UPDATE` on `trial_classes WHERE id = X` (waited for User B's transaction to release).
     - Reads `capacity` (`C`) and calculates confirmed count (`4/C`). Class is NOW FULL!
     - Aborts seat assignment. Updates User A booking status to `payment_failed` (Reason: `CLASS_FULL_RACE_LOST`).
     - Rolls back any seat increment.
     - Returns `409 Conflict` to User A: *"Seat no longer available. Payment refunded/cancelled."*

---

## 6. Functional Requirements

### 6.1 Parent & Child Selection (FR-1)
- User interface allows switching/selecting active Parent from synthetic seed data.
- Displays children associated with the selected parent.

### 6.2 Class Browsing & Real-Time Seat Counter (FR-2)
- Displays active science & math trial classes with date, time, subject, title, capacity (`C`), and current available seats (`C - enrolled_count`).
- Visual badges indicating status: `Available (X seats left)`, `1 Seat Left!`, `Full (C/C)`.
- Updates automatically via WebSocket when seats are taken.

### 6.3 Booking Initiation (FR-3)
- Parent picks child + class -> Submits `POST /api/v1/bookings`.
- Server creates booking record with status `pending_payment`.
- Returns `booking_id` and payment token for completion.

### 6.4 Payment Simulation & Confirmation (FR-4)
- Payment UI component provides options:
  - **Simulate Successful Payment** (`card_success`)
  - **Simulate Declined Payment** (`card_declined` / insufficient funds)
  - **Simulate Network Timeout / Error**
- Frontend sends `POST /api/v1/payments/process`.
- Server executes transactional confirmation logic.

### 6.5 Post-Booking Status Feedback (FR-5)
- Displays clear confirmation screen with:
  - Booking ID, Student Name, Class Title, Time, Status Badge.
  - If successful: Green success banner + class calendar reminder.
  - If failed (Race condition or payment failure): Red warning banner + clear explanation + option to select another class.

### 6.6 Admin Class & Dynamic Capacity Management (FR-6)
- Endpoint `PUT /api/v1/admin/classes/:id` and UI modal allows Admin to edit:
  - Class Title & Subject.
  - Class Start Time.
  - **Student Capacity Limit (`capacity`)** — e.g. change from 4 to 6 or 2 dynamically.
- Server validates that new capacity cannot be set lower than currently confirmed students.

### 6.7 Admin / Teacher Roster View (FR-7)
- View available at `/admin/roster` or class modal.
- Select a trial class to see real-time list of confirmed students (up to dynamic `capacity`), parent contact details, and pending booking count.

---

## 7. Data Model Overview

| Entity | Primary Attributes | Description |
| :--- | :--- | :--- |
| **Parent** | `id`, `name`, `email`, `phone` | Synthetic parent profile |
| **Student** | `id`, `parent_id`, `name`, `age` | Child belonging to a parent |
| **TrialClass** | `id`, `title`, `subject`, `start_time`, `capacity` (Dynamic), `enrolled_count` | Live online trial class session |
| **Booking** | `id`, `student_id`, `trial_class_id`, `status`, `created_at` | Booking attempt & status tracking |
| **PaymentAttempt** | `id`, `booking_id`, `amount`, `status`, `gateway_reference`, `error_code` | Audit record of mock payments |

---

## 8. Non-Functional Requirements & SE Standards

1. **SRP & Clean Architecture**: Logic separated cleanly into Handlers, Services, Repositories, and React Client Components.
2. **Database Engine**: PostgreSQL 16 as the single unified relational engine (MongoDB completely removed).
3. **Performance**: Payment confirmation transaction completes in `< 50ms`.
4. **Concurrency Safety**: 100% thread-safe against concurrent HTTP requests under Go Gin + PostgreSQL row locking.
5. **Portability & Build**: Next.js configured with `output: 'export'` for full client-side static deployment hosted on `ottodot.byteseeker.net`. Backend Go Gin server hosted on `serverottodot.byteseeker.net`.
6. **UI/UX Aesthetics**: Professional global SaaS standards adhering to UI/UX Pro Max rules (dark/light contrast, `rounded-sm` geometry, interactive hover states, accessibility compliant).
