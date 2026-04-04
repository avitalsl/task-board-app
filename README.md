# Gamified Task Board

An interactive task management app that turns productivity into a game. Navigate an avatar around a 2D canvas to select and complete tasks, earn points, and hit period goals.

## Features

- **Spatial task board** — tasks are nodes on a canvas; move your avatar to interact with them
- **Scoring & goals** — earn points per task; set daily or weekly goals with a bonus multiplier for hitting them
- **AI-powered task input** — describe tasks in natural language (text or voice); GPT-4o-mini parses them into structured tasks
- **Voice input** — uses the browser's Web Speech API or falls back to OpenAI Whisper
- **Recurring tasks** — automatically reset each period; one-time tasks stay in history
- **Period history** — completed periods are recorded with scores and goal outcomes

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Canvas | Konva / react-konva |
| State | Zustand (with localStorage persistence) |
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
```

## Project Structure

```
src/
├── App.tsx                    # Root component (3-tab layout)
├── store/index.ts             # Zustand store with persistence
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
│   ├── board/                 # Canvas layout and task completion logic
│   ├── avatar/                # Movement animation and proximity detection
│   ├── ai/                    # GPT-4o-mini parsing, Whisper transcription
│   └── storage/               # localStorage adapter
│
└── hooks/
    ├── useResetCheck.ts       # Polls for period resets every 60s
    └── useVoiceInput.ts       # Web Speech API + Whisper fallback
```

## How It Works

### Board

Tasks appear as circles on a 2D canvas. Circle size scales with point value. Click anywhere on the board to move your avatar; when the avatar gets close enough to a task, it auto-selects. Click the selected task to complete it and earn points.

### Periods

Configure a goal mode in Settings:

- **No Goal** — complete tasks freely with no period tracking
- **Daily** — period resets each day at a configurable hour
- **Weekly** — period resets weekly

When you complete a period having hit your goal, a bonus multiplier is applied to your score.

### Task Input

In the Backlog tab, type or speak a task description. The AI parses it into a title, description, point value, and type (required vs. optional). You can also add tasks manually.

## Testing

```bash
npm run test      # Run all tests with Vitest
```

Tests cover domain services (layout, periods, scoring) and end-to-end integration scenarios.
