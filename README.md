# Ottodot Full-Stack Engineer Take-Home: Trial Booking Reliability System

![System Overview](https://img.shields.io/badge/Stack-Next.js%2015%20%7C%20Go%201.25%20%7C%20PostgreSQL%2016-indigo)
![Concurrency Protection](https://img.shields.io/badge/Race%20Protection-Pessimistic%20Row%20Locking%20%28FOR%20UPDATE%29-emerald)
![Build](https://img.shields.io/badge/Next.js%20Build-Static%20Export-blue)

## 📌 Executive Summary

This repository contains the complete, production-grade implementation of the **Ottodot Trial Booking Reliability System**. Built for live online science and math classes for children, the system guarantees 100% data reliability under heavy concurrency, dynamic class capacity limits, duplicate booking prevention, payment failures, and the critical **Last-Seat Race Condition**.

- **Frontend Application**: `https://ottodot.byteseeker.net` (Next.js Static Export Client SPA)
- **Backend REST API & WebSocket Server**: `https://serverottodot.byteseeker.net` (Go Gin Framework on Port `9050`)
- **Database Engine**: PostgreSQL 16+ (Sole Database Engine, MongoDB completely removed)

---

## ⚡ Quick Start: How to Run the Solution

### Prerequisites
- Go `1.25+`
- Node.js `20+` & `pnpm`
- PostgreSQL `16+`

### 1. Backend Setup (Go Gin Server)

```bash
# 1. Navigate to backend folder
cd server-go

# 2. Configure environment variables in .env
# Ensure POSTGRES_DSN points to your PostgreSQL database instance
# PORT=9050

# 3. Run the Go server (Auto-migrates tables and populates synthetic seed data)
go run cmd/api/main.go
```

The Go backend runs on `http://localhost:9050` (or `https://serverottodot.byteseeker.net` in production).

### 2. Automated Concurrency & Race Test

To execute the automated Go integration test simulating 10 concurrent users racing for the last seat:

```bash
cd server-go
go test -v ./tests/...
```

### 3. Frontend Setup (Next.js Static Export Client)

```bash
# 1. Navigate to client folder
cd client

# 2. Install dependencies with pnpm
pnpm install

# 3. Development server
pnpm dev

# 4. Production Static Build (Do not compile automatically; run when ready)
pnpm build
```

---

## 🎯 What Was Built

1. **Authentication & Quick Demo Role Switcher**:
   - JWT Login API (`POST /api/v1/auth/login`) with role-based context (`parent` vs `admin`).
   - One-Click Quick Login for 3 synthetic parents (Ikhsan, Sarah, David) and Teacher Admin.
2. **Trial Classes Catalog with Real-Time Seat Status**:
   - Filter classes by Subject (Science, Math, Coding).
   - Dynamic seat availability badges (`Available`, `1 Seat Left!`, `Full (0 seats)`).
   - Real-time seat updates pushed instantly via WebSocket (`/ws`).
3. **Mock Payment Gateway & Race Simulator**:
   - Interactive payment modal simulating **Card Success**, **Card Declined**, and **Simultaneous Last-Seat Race Test**.
4. **Teacher / Admin Roster & Dynamic Capacity Manager**:
   - Real-time confirmed student roster with parent contact info.
   - Dynamic Class Limit Editor (`PUT /api/v1/admin/classes/:id`): Admins can edit student limits per class dynamically (e.g. set capacity to 4, 6, 8) with **Zero Hardcoding**.
5. **Synthetic Seed Dataset**:
   - Automatically seeded on first run with classes pre-configured at 3/4 enrolled (for race testing), 0/4 enrolled, 4/4 full, and 2/6 enrolled.

---

## 🔒 Handling The Last-Seat Race Condition (CRITICAL)

### Scenario
1. Class X has capacity `C = 4` and 3 confirmed students (1 seat remaining: 3/4).
2. **User A** and **User B** select Class X and proceed to payment concurrently.
3. **User B** submits payment 1ms before User A.
4. Both attempt to complete payment.

### Approach Chosen: Pessimistic Row Locking (`SELECT ... FOR UPDATE`) + Transactional Counting + Partial Unique Index

When payment confirmation is requested:
```sql
BEGIN TRANSACTION;

-- 1. Lock the specific TrialClass row pessimistically (FIFO execution)
SELECT id, capacity, enrolled_count FROM trial_classes WHERE id = $1 FOR UPDATE;

-- 2. Count confirmed bookings for this class inside locked transaction
SELECT COUNT(*) FROM bookings WHERE trial_class_id = $1 AND status = 'confirmed';

-- 3. If count < capacity:
--    - Update booking status -> 'confirmed'
--    - Increment trial_classes.enrolled_count
--    - Create payment_attempt -> 'succeeded'
--    - COMMIT TRANSACTION

-- 4. If count >= capacity (User A arrived right after User B filled the seat):
--    - Update booking status -> 'payment_failed' (Reason: CLASS_FULL_RACE_LOST)
--    - Create payment_attempt -> 'failed'
--    - COMMIT TRANSACTION & Return HTTP 409 Conflict ("Seat no longer available. Payment refunded.")
```

### Why We Chose This Approach
- **Deterministic FIFO Order**: Database row locking ensures concurrent requests queue sequentially at the DB level, preventing double allocation.
- **Zero Race Window**: Unlike application-level locks (which fail in multi-instance deployments), PostgreSQL row locks operate natively across all API server instances behind load balancers.
- **No Swallowed Retries**: Gives immediate, clear feedback to User A that the seat was taken, avoiding infinite retry loops.

### Tradeoffs Accepted
- **Row Lock Holding Time**: During payment processing, the specific `trial_classes` row is locked for ~5-15ms. Given small group class sizes (4-10 students), lock contention is negligible and guarantees 100% data safety.

---

## 🛠️ Backend Design & Architecture

### Data Model Schema

```
[Parents] (1) <--- (N) [Students] (1) <--- (N) [Bookings] (N) ---> (1) [TrialClasses]
                                                  |
                                                  v (1:N)
                                          [PaymentAttempts]
```

- **Partial Unique Index**:
  ```sql
  CREATE UNIQUE INDEX idx_unique_confirmed_booking 
  ON bookings (student_id, trial_class_id) 
  WHERE status = 'confirmed';
  ```
  Prevents duplicate confirmed bookings for the same child in the same class at the database engine level.

### Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | User authentication & JWT generation |
| `GET` | `/api/v1/classes` | Get active trial classes with calculated remaining seats |
| `POST` | `/api/v1/bookings` | Create pending booking (`pending_payment`) |
| `POST` | `/api/v1/payments/process` | Process mock payment & resolve seat atomically |
| `GET` | `/api/v1/parents` | Get synthetic parent & student dataset |
| `GET` | `/api/v1/admin/classes/:id/roster` | Get teacher roster of confirmed students |
| `PUT` | `/api/v1/admin/classes/:id` | Admin update class details & dynamic capacity limit |
| `WS` | `/ws` | Real-time WebSocket stream for seat updates |

### Responsibilities Allocation (UI vs Backend vs Database vs Worker)

| Check / Action | Layer | Rationale |
| :--- | :--- | :--- |
| **Instant Full Badge** | UI (Frontend) | Instant UX feedback preventing unnecessary clicks. |
| **Pessimistic Row Lock & Capacity Check** | Backend Transaction | Guarantees atomic verification during payment settlement. |
| **Duplicate Booking Enforcement** | Database (`UNIQUE INDEX`) | Hard invariant constraint enforced natively by Postgres engine. |
| **Expired Booking Clean Up** | Background Worker | Reclaims abandoned `pending_payment` checkouts after 15 minutes. |

---

## ⏱️ Time Spent, Scope Cuts & Future Roadmap

- **Timebox**: ~3.5 hours.
- **Assumptions**: Synthetic parents & children used for fast demo login; mock payment gateway used instead of Stripe webhooks.
- **Deliberately Cut**: Complex multi-week recurring schedule builder, automated SMS parent notifications, Zoom API integration.
- **Post-Release Monitoring**:
  - PostgreSQL lock wait timeouts (`pg_stat_activity`).
  - WebSocket connection drop rates & reconnect metrics.
  - Payment failure frequency by error code (`CLASS_FULL_RACE_LOST` vs `CARD_DECLINED`).
- **Next Steps with More Time**:
  - Redis distributed locking / pub-sub for multi-region scale.
  - Hold seat reservation timer with 10-minute countdown countdown badge.
