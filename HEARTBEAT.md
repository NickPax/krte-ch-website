# HEARTBEAT.md

## Session Status Update
Update dashboard session status file:
- Fetch current session stats via `sessions_list` (limit 1)
- Write to `calendar/data/openclaw-status.json` with model, contextSize, contextWindow, cost.total
- Keep dashboard data fresh

## Documentation Check
If significant work completed since last heartbeat (new features, bug fixes, configuration changes, project milestones), log it to `memory/YYYY-MM-DD.md`.

## Calendar Reminders
**Only check between 08:00 and 22:00** (no middle-of-night reminders!)

Check `calendar/data/events.json` for tasks where:
- `remind: true`
- `dueDate` is today or tomorrow
- `status` is NOT "done"

If any found, send a Telegram reminder to Nick (@NickPax, id: 1564164333).
Format: "🔔 Reminder: [task title] - [due date] [time if in title] — [notes if any]"

**Reminder schedule:**
- Day before due date: 1 reminder (~08:00)
- Day of due date: 1 reminder (~08:00)

Only remind once per task per day (track in `memory/reminder-state.json`).

## Time-Based Reminders (X minutes before)
For tasks with `reminderBefore` set to a time-based option (not 'morning'):
1. Parse time from title (e.g., "(14:40)" → 14:40)
2. Check if a cron job already exists for this task (track in `memory/reminder-crons.json`)
3. If not, create a one-shot cron job for the reminder time

**reminderBefore values:**
- `morning` - morning reminders only (default)
- `60` - 1 hour before event time
- `30` - 30 min before event time  
- `15` - 15 min before event time
- `both-60` - morning + 1hr before
- `both-30` - morning + 30min before

Track created cron jobs in `memory/reminder-crons.json`:
```json
{
  "taskId": { "cronJobId": "...", "reminderTime": "2026-02-10T13:40:00" }
}
```
