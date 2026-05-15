# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server (frontend only; /api/* requires the backend)
npm run dev:api   # `vercel dev` — runs frontend + serverless API routes together
npm run build     # tsc -b && vite build
npm run lint      # ESLint (flat config in eslint.config.js)
npm test          # Vitest (jsdom; setup in src/test/setup.ts)
```

Run a single test file: `npx vitest run path/to/file.test.ts`
Watch a single test: `npx vitest path/to/file.test.ts`

Backend handler tests (`server/server.test.ts`) mock `./storage/index.js`, so no `DATABASE_URL` is needed to run them.

In dev, `vite.config.ts` proxies `/api/*` to `localhost:3001`, which is where `vercel dev` serves the serverless functions in `api/`.

## Architecture

### Layering

The frontend is structured as a one-way dependency chain: **`ui` → `application` → `domains` → `store`**.

- `src/domains/` — pure domain logic grouped by responsibility (`tasks`, `board`, `scoring`, `periods`, `settings`, `avatar`, `storage`, `access`, `ai`, `user`). Each domain owns its types and service functions. Domain code does not import from `application/` or `ui/`.
- `src/application/` — use-case orchestration that spans multiple domains (`taskActions.ts`, `periodActions.ts`, `settingsActions.ts`). It talks to the store **through `storePort.ts`** (an `AppStorePort` adapter), not by importing the Zustand store directly. When adding cross-domain flows, put them here.
- `src/store/index.ts` — single Zustand store holding all domain slices plus `ui` state. It also runs two subscriptions: one that persists owner-session state to `localStorage` (skipped during bootstrap and for token sessions), and one set up at runtime by `bootstrap.ts` that debounces backend sync.
- `src/ui/` — React components (`components/`) and screens (`screens/`). `BoardScreen` is a thin shell that picks between `SpatialBoardView` and `NotesRowsBoardView` based on `board.presentation`.

### Access model (owner vs share-link)

The app has two runtime modes, resolved by `domains/access/resolveAccess.ts` from the URL (`?shareToken=...`) and `localStorage`:

- **`owner`** — local-first. State loads synchronously from `localStorage` on store init; backend sync happens in the background.
- **`complete_only_link`** — backend-first. The store starts empty with `isBootstrapping: true`, then `bootstrapTokenUser` populates it from the API. These sessions **never** write to `localStorage`.

Permissions for each access type live in **`domains/access/permissions.ts`** — this is the single source of truth used by both the UI (to gate actions) and the backend handlers (to reject unauthorized calls). When adding a new board action, add it to `BoardPermissions` and update both the UI gate and the server check.

### Bootstrap flows (`src/bootstrap.ts`)

`bootstrapApp()` is called once after React mounts (see `src/main.tsx`). It branches on access type:

- **Owner**: if no `ownerKey` in localStorage, the landing screen drives `createNewBoard()` / `openBoardWithKey()`. Otherwise it fetches the backend board, calls `applyRemoteCompletions()` to merge in any completions made by share recipients (this also updates score and required-task counters), pushes the merged state back, and installs `setupOwnerSyncSubscription()` — a 1.5s-debounced state subscription that PUTs the board to `/api/board`.
- **Token user**: fetches `/api/shared/:token` and populates the store via `setBootstrapped()`.

Key subtlety: when the owner key is renamed (`renameBoardKey`), the existing sync subscription and pending debounce **must be detached first** — they close over the old key and would 403 if they fire mid-rename. Re-install the subscription after the rename succeeds.

### Backend

- `api/` — Vercel serverless entry points (thin handlers that read auth and delegate).
- `server/handlers/` — request handlers shared between Vercel routes and tests.
- `server/storage/` — Neon/Postgres client; schema in `schema.sql`.
- `api/_lib/auth.ts` — extracts owner key / share token from requests.

The server enforces permissions independently of the UI — both derive from `domains/access/permissions.ts` semantics. Don't bypass the server check by gating only in the UI.

### Storage and migration

`domains/storage/persistence.ts` (`bootstrapLocalApp`, `saveAppData`) is the single entry/exit point for `localStorage`. Schema changes go through the migration logic there — see `persistence.test.ts` and `LocalStorageAdapter.test.ts` for the contracts.

### Single-board assumption

The store currently holds a single `board` slice. `boardId` is present on entities as an optional field, kept that way intentionally to leave room for multi-board without forcing a migration now (see `docs/roadmap.md`).

## Environment

`.env` requires:

- `OPENAI_API_KEY` — task parsing (GPT) and voice transcription (Whisper) via `api/ai/*`.
- `DATABASE_URL` — Neon/Postgres for owner board persistence and share-link access.

The frontend can run without these, but owner sync, sharing, and AI features will fail.
