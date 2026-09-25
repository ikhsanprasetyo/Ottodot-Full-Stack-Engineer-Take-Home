# Rules & Project Directory Map

## Important File & Directory Locations

### Project Root Documentation
- `PRD.md`: Product Requirements Document detailing scope, invariants, edge cases, and WebSocket specs.
- `architecture.md`: Architecture specification including Mermaid diagrams, DDL scripts, pessimistic locking, and SE standards.
- `mvp.md`: MVP task checklist and implementation progress log.
- `rules.md`: Key directory locations and project workspace mapping (this file).
- `README.md`: Submission documentation, execution steps, last-seat race explanation, and backend design.
- `AI_USAGE.md`: Governance report on AI tool usage, velocity gains, decision corrections, and verification.

### Frontend Application (`client/`)
- Base Directory: `c:\Project\Web\Ottodot Full-Stack Engineer Take-Home\client`
- Auth Login Page: `client/app/page.tsx` (JWT login & Quick Seed Selector)
- Main Dashboard SPA: `client/app/dashboard/page.tsx` (Classes discovery, Payment simulator, Bookings status, Teacher Roster & Dynamic Capacity Manager)
- API Client Integration: `client/lib/ottodot-api.ts` (Axios API targeting `serverottodot.byteseeker.net` / port 9050)
- Real-time WebSocket Hook: `client/lib/useWebSocket.ts`
- Static Export Configuration: `client/next.config.ts` (`output: 'export'`)
- Domain Configuration: `https://ottodot.byteseeker.net`

### Backend Application (`server-go/`)
- Base Directory: `c:\Project\Web\Ottodot Full-Stack Engineer Take-Home\server-go`
- Main Entrypoint: `server-go/cmd/api/main.go`
- Ottodot Data Models: `server-go/internal/models/ottodot.go` & `server-go/internal/models/user.go`
- Repository & Concurrency Engine: `server-go/internal/repositories/ottodot_repository.go` & `server-go/internal/repositories/user_repository.go` (Pessimistic Row Locks `SELECT ... FOR UPDATE`)
- HTTP Controllers: `server-go/internal/controllers/ottodot_controller.go`, `server-go/internal/controllers/auth_controller.go`
- WebSocket Event Hub: `server-go/internal/websocket/hub.go`
- Synthetic Seed Loader: `server-go/internal/data/seed.go`
- Database Configuration: `server-go/internal/config/database.go`
- Automated Concurrency Test: `server-go/tests/concurrency_test.go`
- Environment Config: `server-go/.env` (Port `9050`)
- Domain Configuration: `https://serverottodot.byteseeker.net`

### User Rule Reminders
1. **Build/Compile**: Do NOT run compile or build directly; instruct the user to run `pnpm build` or `go build` if needed to save tokens and respect user workflow.
2. **Package Manager**: Always reference `pnpm` for frontend commands.
3. **UI/UX Aesthetics**: Use UI/UX Pro Max guidelines (`rounded-sm` geometry everywhere except profile picture, no emojis as icons, cursor-pointer, stable hover states, clean contrast).
4. **Data Integrity**: Concurrency protection uses PostgreSQL `SELECT ... FOR UPDATE` row locks inside atomic transactions.
