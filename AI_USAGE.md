# AI Usage & Engineering Governance Report

## 🤖 1. AI Tools Utilized
- **AI Coding Assistant**: Antigravity AI (Powered by Gemini 3.6 Flash / Advanced Agentic Coding Engine).
- **Primary Use Cases**: Architectural design documentation, database schema modeling, PostgreSQL pessimistic locking strategy, Go Gin concurrency service, and Next.js SPA frontend components.

---

## 🎯 2. What We Used AI For

1. **Architecture & PRD Drafting**: Generating formal `PRD.md` and `architecture.md` documents detailing business invariants, PostgreSQL schema DDL, and GFM Mermaid sequence diagrams.
2. **Concurrency Engine Implementation**: Writing Go repository code using GORM `clause.Locking{Strength: "UPDATE"}` (`SELECT ... FOR UPDATE`) to handle the Last-Seat Race Condition.
3. **Automated Integration Testing**: Constructing the Go unit/integration test suite (`server-go/tests/concurrency_test.go`) to simulate 10 concurrent goroutines racing for the last available seat.
4. **Next.js Static Export SPA**: Building a modern dashboard UI (`client/app/dashboard/page.tsx`) with UI/UX Pro Max standards (`rounded-sm` geometry, dark/light contrast, Lucide icons, no emojis as icons).

---

## 🚀 3. Where AI Helped Move Faster

- **Rapid Boilerplate & Test Suite Generation**: Generating the synthetic seed dataset (`server-go/internal/data/seed.go`) and setting up the Go concurrency test suite with `sync.WaitGroup` and channels took under 5 minutes, dramatically saving setup time.
- **WebSocket Hub Integration**: AI helped quickly draft the Go Gorilla WebSocket broadcast hub (`server-go/internal/websocket/hub.go`) to stream real-time seat update events to the client SPA.

---

## 💡 4. Where We Disagreed With, Corrected, or Rejected AI Output

### Disagreement: Optimistic Locking vs. Pessimistic Row Locking for Last-Seat Race
- **Initial AI Recommendation**: The AI initially suggested an Optimistic Locking pattern using a `version` integer column on `trial_classes` and retrying HTTP requests upon version conflict.
- **My Correction & Rejection**:
  - *Reasoning*: In a payment processing flow, asking a user to retry their payment because of a version conflict creates horrible UX and risk of double charges.
  - *Action Taken*: I rejected the optimistic retry pattern and mandated **PostgreSQL Pessimistic Row Locking (`SELECT ... FOR UPDATE`)** inside an atomic SQL transaction. This guarantees deterministic FIFO execution at the DB level, ensuring User B completes payment smoothly while User A is immediately and cleanly rejected with a `409 Conflict` (Seat Full / Payment Refunded).

---

## 🔄 5. What We Would Change About the AI Workflow Next Time

- **Incremental Schema Validation**: Instead of generating full schema DDL at once, prompt the AI to validate individual foreign key constraints and index conditions incrementally to catch PostgreSQL version nuances earlier.
- **Automated Mock Generator**: Provide pre-defined OpenAPI specs to the AI to auto-generate mock client interfaces even faster.

---

## ✅ 6. How We Verified the Final Implementation

1. **Automated Integration Verification**: Executed `go test -v ./tests/...` verifying that 10 concurrent goroutines competing for 1 remaining seat produce **exactly 1 confirmed booking** and **9 rejected bookings**, with database `COUNT(confirmed) == 4`.
2. **Real-time WebSocket Inspection**: Opened 2 browser windows simultaneously, performed a booking in Window 1, and verified Window 2's seat counter badge updated instantly from `1 Seat Left` to `FULL (0 seats)`.
3. **Admin Dynamic Capacity Verification**: Tested editing a class capacity from 4 to 6 via the Admin UI, verifying that new seats immediately opened up for booking.
