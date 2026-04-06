# Roadmap

## MVP Status

The MVP is complete. It covers a fully local, single-user, single-board, single-device experience with no backend.

### What was built

**Product:**
- Spatial task board with avatar movement
- Task CRUD (manual + AI-assisted via GPT-4o-mini + Whisper)
- Scoring system with period goals (daily/weekly) and bonus multiplier
- Period history
- Board modes: `manage` (full editing) and `play` (completion only) — policy enforced in UI; mode-switching UI deferred

**Architecture (intentional foundations for future expansion):**

| Step | What was done |
|---|---|
| 1 | Explicit domain entity types introduced (`Board`, `Task`, `User`, etc.) |
| 2 | Runtime ownership links added (`boardId`, `userId`) on all entities; schema migration v1→v2 |
| 3 | Persistence/bootstrap centralized behind `persistence.ts` (`bootstrapLocalApp`, `saveAppData`) |
| 4 | Multi-domain orchestration extracted into `src/application/` layer |
| 5 | Application layer's direct Zustand coupling reduced via `AppStorePort` adapter |
| 6 | Board-mode policy centralized in `boardPolicy.ts` (`getBoardPermissions`) |
| 7 | Architecture hardened with focused tests: bootstrap behavior, migration correctness, core flows |

### Known partial implementations (intentional deferral)

- `boardId` on entity types is currently `boardId?: string` (optional). Making it required was deferred to avoid test churn — a future step can enforce it.
- `User` type exists in `src/domains/user/types.ts` but no user entity is held in the store. Ownership is implied via `DEFAULT_USER_ID = 'local-user'`.
- `board.mode` is always `'manage'` at runtime — there is no UI to switch to play mode. The policy is wired and enforced; the switching UI is post-MVP.
- `checkReset` (period reset) is re-exported from `application/periodActions.ts` but the logic remains in `domains/periods/service.ts` — it is coupled to private helpers and was not moved in Step 5.

---

## Out of Scope for MVP

- Authentication / user accounts
- Backend / server-side persistence
- Multiple boards UI
- Multi-user behavior
- Board sharing
- Role or permission systems beyond the current manage/play board mode
- Sync across devices

---

## Post-MVP Phases

### Phase 1 — True multi-board runtime (no UI yet)

**Goal:** Make the runtime capable of holding multiple boards without exposing a board-switcher UI.

**Why this comes first:** The MVP introduced `boardId` links and a default board constant as a single-board bridge. Before any UI or backend work, the data model and store should natively support multiple boards so that the product can grow without a data-breaking migration.

**In scope:**
- Make `boardId` required (non-optional) on all entity types
- Store currently active board as a proper selection in the store (replacing the constant bridge)
- Scope all queries (tasks, periods, settings) to `boardId` in services
- Update bootstrap to load tasks/settings/period for the active board
- Schema migration v2→v3 if needed

**Out of scope:**
- Any UI to create, list, or switch boards
- Multi-user concerns

---

### Phase 2 — Multi-board UI

**Goal:** Let the user create and switch between boards.

**Why this comes after Phase 1:** The runtime needs to be board-scoped before the UI can expose it safely.

**In scope:**
- Board creation, naming, deletion
- Board switcher UI
- Per-board settings and period state
- Board-scoped scoring

**Out of scope:**
- Board sharing
- Auth

---

### Phase 3 — Auth and backend integration

**Goal:** Move persistence from `localStorage` to a real backend, gated by authentication.

**Why this comes after Phase 2:** Local-first multi-board UX should be stable before introducing a network layer and auth flow.

**In scope:**
- User authentication (email/OAuth)
- Remote persistence (API-backed storage replacing `localStorage`)
- Data migration from local to remote on first sign-in
- Replace `LocalStorageAdapter` with a remote adapter behind the same `StorageAdapter` interface

**Out of scope:**
- Board sharing (separate phase)
- Offline-first sync (can be addressed separately)

---

### Phase 4 — Board sharing, memberships, and roles

**Goal:** Allow boards to be shared between users with role-based access.

**Why this comes after Phase 3:** Requires real user identities (auth) and remote persistence.

**In scope:**
- Board membership model (owner, editor, viewer)
- Invitation/sharing flow
- Role-scoped board-mode policy (extending the existing `boardPolicy.ts` pattern)
- Real-time or polling-based sync for shared boards

**Out of scope:** Determined by product direction at that time.

---

### Phase 5 — Stronger repository model (if needed)

**Goal:** Formalize the data access layer if remote persistence introduces meaningful complexity.

**Why this is conditional:** The current `StorageAdapter` interface and `storePort` pattern may be sufficient for early backend integration. A full repository layer is only warranted if the remote model is complex enough to justify it.

**In scope (if triggered):**
- `TaskRepository`, `PeriodRepository`, `ScoringRepository` interfaces
- Remote-backed implementations
- Offline cache and sync strategy

---

*This roadmap reflects intent, not commitment. Phases and scope will be revisited as the product evolves.*
