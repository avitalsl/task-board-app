# Gamified Task Board

An interactive task management app that turns productivity into a game. Navigate an avatar around a 2D canvas to select and complete tasks, earn points, and hit period goals.

## MVP Status

The app is at MVP. It runs fully local — one user, one board, one device, no backend.

The codebase was deliberately structured during the MVP to support future expansion (multi-board, auth, backend). See [`docs/roadmap.md`](docs/roadmap.md) for what comes next.

## Usage Model

- Single local user, single board, single device
- All data is stored in `localStorage` — no account, no sync
- Works offline

## Features

- **Spatial task board** — tasks are nodes on a canvas; move your avatar to interact with them
- **Scoring & goals** — earn points per task; set daily or weekly goals with a bonus multiplier for hitting them
- **AI-powered task input** — describe tasks in natural language (text or voice); GPT-4o-mini parses them into structured tasks
- **Voice input** — uses the browser's Web Speech API or falls back to OpenAI Whisper
- **Recurring tasks** — automatically reset each period; one-time tasks stay in history
- **Period history** — completed periods are recorded with scores and goal outcomes
- **Board modes** — `manage` mode for full editing access; `play` mode locks down editing (policy enforced, mode-switching UI deferred post-MVP)

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Canvas | Native SVG |
| State | Zustand (with `localStorage` persistence) |
| AI | OpenAI SDK (GPT-4o-mini, Whisper) |
| Testing | Vitest, jsdom |

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Setup

```bash
npm install
cp .env.example .env
# Add your OpenAI API key to .env
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_OPENAI_API_KEY` | OpenAI API key (required for AI input and Whisper) |

### Running

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check and build for production
npm run preview   # Preview the production build
npm run lint      # Run ESLint
npm test          # Run all tests with Vitest
```

## Project Structure

```
src/
├── App.tsx                    # Root component (3-tab layout)
├── store/index.ts             # Zustand store — runtime state and setters
│
├── application/               # Use-case layer — multi-domain orchestration
│   ├── taskActions.ts         # handleTaskComplete
│   ├── settingsActions.ts     # changeMode, updateTargetScore, resetToDefaults
│   ├── periodActions.ts       # checkReset (re-export boundary)
│   └── storePort.ts           # Thin adapter: application layer → Zustand
│
├── ui/
│   ├── components/            # TaskNode, AvatarSprite, ProgressBar, etc.
│   └── screens/               # BoardScreen, BacklogScreen, SettingsScreen
│
├── domains/
│   ├── tasks/                 # Task types and CRUD service
│   ├── periods/               # Period lifecycle (daily/weekly resets)
│   ├── scoring/               # Points, goal evaluation, bonus multiplier
│   ├── settings/              # Goal mode and configuration
│   ├── board/                 # Layout, task completion logic, board-mode policy
│   ├── avatar/                # Movement animation and proximity detection
│   ├── ai/                    # GPT-4o-mini parsing, Whisper transcription
│   ├── storage/               # localStorage adapter, schema migration, bootstrap
│   └── user/                  # User type (foundation for future auth)
│
├── hooks/
│   ├── useResetCheck.ts       # Polls for period resets every 60s
│   └── useVoiceInput.ts       # Web Speech API + Whisper fallback
│
└── docs/
    └── roadmap.md             # Post-MVP phases and architecture continuation
```

## How It Works

### Board

Tasks appear as circles on a 2D canvas. Circle size scales with point value. Click anywhere on the board to move your avatar; when the avatar gets close enough to a task, it auto-selects. A task action menu lets you complete or edit the task.

### Periods

Configure a goal mode in Settings:

- **No Goal** — complete tasks freely with no period tracking
- **Daily** — period resets each day at a configurable hour
- **Weekly** — period resets weekly

When you complete a period having hit your goal, a bonus multiplier is applied to your score.

### Task Input

In the Backlog tab, type or speak a task description. The AI parses it into a title, description, point value, and type (required vs. optional). You can also add tasks manually.
