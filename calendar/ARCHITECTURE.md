# Mission Control Architecture

## Overview
A unified dashboard for managing tasks, viewing conversations, and searching across all data.

## Current Structure
```
calendar/
├── data/
│   └── events.json          # Tasks, projects, events
├── src/
│   ├── App.vue              # Main app (calendar + kanban)
│   ├── components/
│   │   ├── Calendar.vue     # Month view
│   │   ├── TaskList.vue     # Task sidebar
│   │   └── Kanban.vue       # Project boards
│   └── main.js
└── server.js                # Express API
```

## Planned Expansion

### New Components
- `Conversations.vue` — Browse past chat sessions
- `Search.vue` — Global search across tasks + conversations
- `Documents.vue` — File browser (future)
- `Navigation.vue` — Top nav with panel switching

### API Endpoints

#### Existing
- `GET /api/data` — All calendar data
- `POST /api/data` — Save calendar data
- `POST /api/tasks` — Add single task
- `PATCH /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task

#### New (Conversations)
- `GET /api/sessions` — List all sessions with metadata
- `GET /api/sessions/:id` — Get full transcript for a session
- `GET /api/search?q=` — Search across tasks and conversations

### Data Sources

#### Tasks/Calendar
- `calendar/data/events.json`

#### Conversations
- `~/.openclaw/agents/main/sessions/*.jsonl` — Session transcripts
- Each line is a JSON message object
- Can use `sessions_list` and `sessions_history` APIs too

### Navigation Structure
```
┌─────────────────────────────────────────────────────────┐
│  🦉 Mission Control    [📅 Calendar] [📊 Boards]        │
│                        [📜 Conversations] [🔍 Search]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Active Panel Content]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Order
1. ✅ Calendar view
2. ✅ Kanban boards
3. ✅ Task persistence
4. ✅ Telegram reminders
5. 🔄 Add navigation/panel switching
6. ⏳ Conversations panel
7. ⏳ Search functionality
8. ⏳ Documents panel (future)
