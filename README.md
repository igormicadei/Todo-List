# Todo List

A local-first task and project manager desktop app, built with Electron and
styled with [IBM Carbon Design](https://carbondesignsystem.com/). Everything
— the UI, the database, and the REST API — runs on your own machine; nothing
is sent anywhere except your own configured AI provider, and only when you
use the agent chat.

## Features

- **Projects & tasks** — organize tasks by project and scheduled date, with
  full create/edit/delete for both.
- **Day / Week / Month calendar views** — see what's scheduled and which
  project each task belongs to.
- **Today dashboard** — a progress bar for today's tasks, plus a simplified
  Next / Doing kanban board (drag and drop between columns, or straight to
  Done) for the day's work.
- **Task statuses** — Queued, In Progress, Blocked, Paused, Postponed, Done.
  Moving a task or subtask to Blocked, Paused, or Postponed requires a
  comment explaining what happened — enforced by the API, not just the UI.
- **Subtasks** — a checklist under each task, with its own statuses and
  comment threads, for breaking a task into smaller pieces.
- **Rich-text comments & updates** — an [editor.js](https://editorjs.io/)
  powered activity log on every task and subtask.
- **Dependencies** — mark a task as depending on another; it's flagged as
  blocked until that dependency is Done, with cycle detection.
- **Gantt view** — see what depends on what, and when each task is
  scheduled, with drag-to-reschedule.
- **AI agent** — a chat panel that can plan your day, reorganize the kanban
  board, or split a big task into subtasks. Point it at Claude or any
  Anthropic-compatible endpoint by setting a base URL, model, and API key in
  Settings.
- **A real local REST API** — the desktop app is just one client of its own
  API. Any other application on your machine can read and control your
  tasks, projects, and dependencies using the bearer token shown in
  Settings.

## Requirements

- Node.js 20 or newer
- npm

## Setup

```bash
npm install
```

This also generates the Prisma client and rebuilds native dependencies
(`better-sqlite3`) for Electron's Node ABI.

## Development

```bash
npm run dev
```

Launches the app with hot reload for the renderer and auto-restart for the
main process. On first launch, the app creates its local SQLite database and
a random API token under your OS's app-data directory (e.g.
`~/.config/todo-list/` on Linux, `~/Library/Application Support/todo-list/`
on macOS, `%APPDATA%/todo-list/` on Windows) and applies its bundled
migrations automatically — no manual database setup needed.

### Useful scripts

| Command                  | What it does                                              |
| ------------------------- | ---------------------------------------------------------- |
| `npm run dev`              | Run the app in development mode                            |
| `npm run build`            | Build the main/preload/renderer bundles to `out/`           |
| `npm run build:linux`      | Build, then package an unpacked Linux app into `dist/`      |
| `npm run typecheck`        | Type-check both the main/preload and renderer TypeScript     |
| `npm run prisma:migrate`   | Create a new Prisma migration during development (`prisma/migrations`) — only needed if you change `prisma/schema.prisma` |

## Building a distributable

```bash
npm run build
npx electron-builder --linux   # or --mac / --win
```

`electron-builder.yml` is already configured for Linux (AppImage + deb), mac
(dmg), and Windows (nsis) targets, including the extra steps Prisma needs
(unpacking its native query engine from the packaged app's asar archive, and
shipping the migration SQL files as extra resources). Building for mac/win
from a non-mac/win machine may require platform-specific tooling that
`electron-builder` will prompt you to install.

## Configuring the AI agent

1. Open **Settings** in the app.
2. Set the **Base URL** (defaults to `https://api.anthropic.com` if left
   blank), a **Model** (e.g. `claude-sonnet-5`), and your **API key**.
3. Open the agent chat panel (the chat icon in the top-right of the header)
   and start asking it to plan your day, move cards around, or split a task
   into subtasks.

Any endpoint that speaks the Anthropic Messages API (`POST /v1/messages`,
including tool use) works here — that includes Claude itself and any
compatible third-party gateway or proxy.

## Using the API from another application

The app's REST API is not a side feature bolted onto the UI — the renderer
is just one client of it. Every request needs a bearer token:

```
Authorization: Bearer <token from Settings → API access>
```

The base URL is `http://127.0.0.1:<port>` (the port is fixed at `4317` by
default; see `src/main/config.ts`). For example:

```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:4317/api/tasks
```

Key resources: `/api/projects`, `/api/tasks` (with nested
`/:id/subtasks`, `/:id/dependencies`, `/:id/comments`,
`/:id/status`), `/api/subtasks/:id`, `/api/views/{calendar,kanban,gantt,progress}`,
`/api/settings`, and `/api/agent/{chat,messages,reset}`. Setting a task's or
subtask's status to `BLOCKED`, `PAUSED`, or `POSTPONED` requires a `comment`
(an [editor.js](https://editorjs.io/) `OutputData` object) in the same
request.

The token can be regenerated at any time from Settings if it's ever
exposed; the app updates itself to use the new token immediately.

## Project structure

```
prisma/schema.prisma       Data model (Project, Task, Subtask, TaskDependency,
                            TaskComment, SubtaskComment, Settings, AgentMessage)
src/main/                  Electron main process
  config.ts                 userData paths, token persistence
  server/                   Express app: services, routes, auth, the agent's
                             Anthropic client and tool-use loop
  index.ts                  App lifecycle, window creation
src/preload/                contextBridge — exposes the API base URL/token
                             to the renderer, nothing else
src/renderer/src/           React + Carbon UI
  api/                       Typed REST client
  pages/                     Today, Calendar, Gantt, Projects, Settings
  components/                Kanban, task detail panel, rich-text editor,
                             agent chat panel, etc.
```

## Data storage

Everything lives in a single SQLite file under your OS's per-user app-data
directory (see above) — nothing is stored in this repository, and nothing
leaves your machine except agent chat requests, which go only to the
provider you configure in Settings.
