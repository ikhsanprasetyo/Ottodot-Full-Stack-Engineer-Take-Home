# Rules & Project Directory Map

## Important File & Directory Locations

### Project Root
- `PRD.md`: Product Requirements Document detailing scope, invariants, and edge cases.
- `architecture.md`: Architecture specification including Mermaid diagram, database schemas, and race condition handling details.
- `mvp.md`: MVP task checklist and implementation status.
- `rules.md`: Key directory locations and project workspace mapping (this file).
- `README.md`: Submission documentation, setup steps, architectural tradeoffs, and monitoring notes.
- `AI_USAGE.md`: Report on AI assistance, prompt steerage, corrections, and verification.

### Frontend Application (`client/`)
- Base Directory: `c:\Project\Web\Ottodot Full-Stack Engineer Take-Home\client`
- Next.js App Router: `client/app/`
- Custom UI Components: `client/components/`
- API Client Integration: `client/lib/api.ts`
- Static Export Output: `client/out/` (generated via `output: 'export'` in `next.config.ts`)
- Config Files: `client/next.config.ts`, `client/tailwind.config.ts`, `client/package.json`
- Domain Configuration: `https://ottodot.byteseeker.net`

### Backend Application (`server-go/`)
- Base Directory: `c:\Project\Web\Ottodot Full-Stack Engineer Take-Home\server-go`
- Main Entrypoint: `server-go/cmd/api/main.go`
- HTTP Controllers: `server-go/internal/controllers/`
- Booking & Concurrency Services: `server-go/internal/services/`
- Database Repositories & Models: `server-go/internal/repositories/`, `server-go/internal/models/`
- Configuration & Seed Data: `server-go/internal/config/`, `server-go/internal/data/`
- Concurrency Tests: `server-go/tests/`
- Dependencies & Go Module: `server-go/go.mod`, `server-go/go.sum`
- Domain Configuration: `https://serverottodot.byteseeker.net`

### User Rule Reminders
1. **Build/Compile**: Do NOT run compile or build directly; instruct the user to run `pnpm build` or `go build` if needed to save tokens and respect user workflow.
2. **Package Manager**: Always reference `pnpm` for frontend commands.
3. **UI/UX Aesthetics**: Use UI/UX Pro Max guidelines (`rounded-sm`, no emojis as icons, cursor-pointer, stable hover states, clean contrast).
4. **Data Integrity**: Concurrency protection uses PostgreSQL `SELECT ... FOR UPDATE` row locks inside atomic transactions.
