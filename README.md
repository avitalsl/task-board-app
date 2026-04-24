# Gamified Task Board

A task management app that makes execution feel like a game.

Tasks live on a board, you complete them for points, track progress across periods, and can choose how the board is presented: either as an interactive spatial map or as note cards arranged in rows.

## Current Status

This project is still MVP-oriented, but it is no longer "local only" in the strict sense.

It now supports two modes of operation:

- **Local-first owner mode** — the owner can use the app with browser persistence through `localStorage`
- **Shared-link mode** — the owner can generate a complete-only share link backed by the API/database layer

The codebase is already structured for future expansion, including richer sharing, more board presentations, and more advanced board interactions.

## What the App Does

### Board presentations

The board currently supports two presentation styles:

- **Spatial** — the original SVG board with an avatar that moves around the map and interacts with task nodes
- **Notes** — active tasks shown as note cards in responsive rows

The presentation choice is stored on the board itself so it can evolve later into more layouts without overloading board permissions.

### Task management

- Create tasks manually from the backlog
- Parse natural-language task input into structured tasks with AI
- Use voice input to add tasks
- Edit, duplicate, and delete tasks
- Mark tasks as complete from the board
- Track required vs optional tasks
- Support recurring and one-time task lifecycles

### Scoring and goals

- Total score across the lifetime of the board
- Period-based score tracking
- Goal modes:
  - `no_goal`
  - `daily`
  - `weekly`
  - `unlimited`
- Bonus multiplier when a period goal is achieved
- Required-task targets in addition to point targets
- Period history for completed periods

### Sharing and access

- Owners can generate and revoke a share link
- Shared recipients get a **complete-only** board view
- Shared recipients cannot edit tasks or access backlog/settings
- The owner remains local-first, with backend sync used when available

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| State | Zustand |
| Board rendering | Native SVG |
| AI | OpenAI API via Vercel API routes |
| Backend | Vercel serverless functions |
| Persistence | `localStorage` + Neon/Postgres for shared boards |
| Testing | Vitest + jsdom + Testing Library |

## Architecture Overview

The app is split into a few clear layers:

### `src/ui`
Presentation layer.

- `components/` — reusable UI pieces such as task nodes, the avatar sprite, progress bar, completed task icons, action menus, and the voice modal
- `screens/` — main app screens such as board, backlog, and settings

### `src/application`
Use-case orchestration layer.

This layer coordinates domain operations across multiple areas of the app.

Examples:
- `taskActions.ts`
- `settingsActions.ts`
- `periodActions.ts`
- `storePort.ts`

### `src/domains`
Domain-oriented logic, grouped by business responsibility.

- `access/` — owner vs shared-link permissions and access resolution
- `ai/` — task parsing and transcription client-side orchestration
- `avatar/` — avatar movement and selection behavior
- `board/` — board logic, layout logic, and board policy
- `periods/` — period lifecycle and reset rules
- `scoring/` — score updates and goal evaluation
- `settings/` — board/game settings
- `storage/` — local persistence and schema migration
- `tasks/` — task lifecycle and CRUD behavior
- `user/` — base user typing

### `src/store`
Central Zustand runtime store.

The store holds the main app state:
- board
- tasks
- settings
- scoring
- period
- period history
- avatar
- UI state

### `server/` and `api/`
Server-side support for shared access and AI routes.

- `api/` exposes Vercel serverless endpoints
- `server/` contains backend handlers and persistence logic

## Core Runtime Flows

### Owner bootstrap

When the app loads in owner mode:

1. Local state is available immediately from `localStorage`
2. The app attempts to initialize or reconnect backend ownership using an `ownerKey`
3. If backend sync succeeds, the latest shared completions are reconciled into local state
4. The owner state is then synced back to the backend with debounce
5. If the backend is unavailable, the app continues in local-first mode

### Shared-link bootstrap

When the app loads with `?shareToken=...`:

1. The app fetches board state from the backend
2. It enters a restricted complete-only access mode
3. The shared user can complete tasks but cannot edit or change settings

### Board view switching

`BoardScreen` is a thin shell that reads `board.presentation` and renders one of two views:

- `SpatialBoardView`
- `NotesRowsBoardView`

This keeps presentation concerns separate from board permissions and makes future layouts easier to add.

## Project Structure

```text
.
├── api/                          # Vercel serverless endpoints
├── server/                       # Backend handlers and storage
├── docs/                         # Project documentation
├── public/                       # Static assets
├── src/
│   ├── api/                      # Frontend API client
│   ├── application/              # Use-case orchestration
│   ├── domains/                  # Domain-oriented logic
│   ├── hooks/                    # React hooks
│   ├── store/                    # Zustand store
│   ├── ui/
│   │   ├── components/           # Reusable UI elements
│   │   └── screens/              # App screens
│   ├── App.tsx                   # Root app shell
│   ├── bootstrap.ts              # Owner/shared bootstrap logic
│   └── main.tsx                  # Entry point
├── .env.example
├── package.json
├── vercel.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- npm
- An OpenAI API key for AI features
- A Postgres/Neon database if you want shared-link support

### Install

```bash
npm install
cp .env.example .env
```

### Environment variables

`.env.example` currently expects:

```bash
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgres://user:password@host/db?sslmode=require
```

#### What each variable is used for

- `OPENAI_API_KEY` — required for task parsing and Whisper transcription through the API routes
- `DATABASE_URL` — required for owner initialization, shared-link access, and backend board persistence

## Running the app

### Frontend only

```bash
npm run dev
```

This starts the Vite app.

The UI can still load local state, but API-dependent features such as sharing and AI routes require the backend layer.

### Frontend + API locally

```bash
npm run dev:api
```

This uses `vercel dev` so the frontend and API routes run together.

## Scripts

```bash
npm run dev       # Start Vite dev server
npm run dev:api   # Start Vercel dev environment
npm run build     # Type-check and build
npm run preview   # Preview the production build
npm run lint      # Run ESLint
npm test          # Run Vitest
```

## Testing

The project includes tests around:

- board logic
- scoring
- periods
- tasks
- storage migration
- avatar behavior
- screen rendering
- backend handlers

Run tests with:

```bash
npm test
```

## Notes for Future Work

The current structure already leaves room for:

- more board presentation modes
- drag-and-drop ordering in the notes presentation
- richer sharing and membership models
- stronger backend validation
- multi-board support
- authentication and real user accounts

## Related docs

- `docs/roadmap.md` — planned next phases after the MVP foundation
