# OpenClaw Knowledge Base

*Research conducted 2026-02-10 after failing to understand why heartbeat matters.*

## What OpenClaw Is

OpenClaw is a **self-hosted gateway** that connects chat apps (WhatsApp, Telegram, Discord, iMessage, Signal) to AI agents. It's the bridge between messaging surfaces and an always-available AI assistant.

**Key properties:**
- Self-hosted: runs on your hardware, your rules
- Multi-channel: one Gateway serves all messaging apps simultaneously
- Agent-native: built for tool use, sessions, memory, multi-agent routing
- Open source: MIT licensed

**Created by:** @steipete (Peter Steinberger)
**Source:** https://github.com/openclaw/openclaw
**Docs:** https://docs.openclaw.ai

## Architecture

```
Chat apps (WhatsApp/Telegram/Discord/iMessage)
         ↓
    [Gateway] ← Single source of truth for sessions, routing, connections
         ↓
    [Pi agent] + Tools + Memory + Skills
```

The Gateway is a single long-lived process that:
- Maintains provider connections
- Exposes WebSocket API for clients
- Manages sessions (per-sender, per-group)
- Runs heartbeat scheduler
- Runs cron scheduler
- Handles media in/out

## Heartbeat — WHY IT MATTERS

**Heartbeat is what makes OpenClaw a TRUE ASSISTANT, not just a chatbot.**

Without heartbeat, an agent can only REACT to messages. With heartbeat, the agent can:
- Check inbox for urgent emails
- Review calendar for upcoming events
- Surface anything that needs attention
- Do background work proactively
- Check in during quiet periods

### How Heartbeat Works

1. Every N minutes (default 30m), Gateway triggers an agent turn
2. Agent reads `HEARTBEAT.md` (if exists) as its checklist
3. Agent checks things, decides if anything needs attention
4. If nothing urgent: replies `HEARTBEAT_OK` (suppressed, user never sees it)
5. If something needs attention: sends an alert to the configured channel

### The Heartbeat Contract

```
If nothing needs attention → reply HEARTBEAT_OK (suppressed)
If something needs attention → reply with alert text (delivered)
```

### Heartbeat Config

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",           // interval (0m disables - DON'T DO THIS)
        model: "...",           // can use cheaper model for heartbeats
        target: "last",         // where to deliver alerts
        activeHours: { start: "08:00", end: "22:00" }  // optional
      }
    }
  }
}
```

### Why I Was Wrong to Suggest Disabling Heartbeat

Disabling heartbeat would lobotomize the assistant. It would become purely reactive — no proactive checking, no background awareness, no reaching out. The whole point of a personal assistant is that it can be proactive!

## Heartbeat vs Cron: When to Use Each

| Use Case | Use | Why |
|----------|-----|-----|
| Check inbox every 30 min | Heartbeat | Batches with other checks, context-aware |
| Send daily report at 9am sharp | Cron (isolated) | Exact timing needed |
| Monitor calendar | Heartbeat | Natural fit for periodic awareness |
| One-shot reminder in 20 min | Cron | Precise timing |
| Background project check | Heartbeat | Piggybacks on existing cycle |

### Heartbeat Advantages
- **Batches multiple checks** in one agent turn (cheaper)
- **Context-aware**: agent has full session context
- **Smart suppression**: HEARTBEAT_OK = no message delivered
- **Natural timing**: slight drift is fine for monitoring

### Cron Advantages
- **Exact timing**: 5-field cron expressions with timezone
- **Session isolation**: runs in separate session, no pollution of main
- **Model overrides**: use cheaper/stronger model per job
- **One-shot support**: `--at` for precise future timestamps

## Sessions

- **Main session**: `agent:<agentId>:main` — DM continuity
- **Group sessions**: `agent:<agentId>:<channel>:group:<id>`
- **Cron sessions**: `cron:<jobId>` — isolated per run
- **Subagent sessions**: spawned for background tasks

Session transcripts: `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

## Memory

Memory is **plain Markdown in the workspace**. The model only "remembers" what's written to disk.

- `memory/YYYY-MM-DD.md` — daily log (append-only)
- `MEMORY.md` — curated long-term memory (main session only!)

Vector search is available for semantic queries across memory files.

## Workspace Files (Bootstrap)

- `AGENTS.md` — operating instructions
- `SOUL.md` — persona, boundaries, tone
- `TOOLS.md` — user-maintained tool notes
- `IDENTITY.md` — agent name/vibe/emoji
- `USER.md` — user profile
- `BOOTSTRAP.md` — one-time first-run ritual (delete after)
- `HEARTBEAT.md` — heartbeat checklist

## Key Commands

```bash
openclaw status          # local status
openclaw status --all    # full diagnosis
openclaw gateway         # start gateway
openclaw dashboard       # open web UI
openclaw cron list       # list cron jobs
openclaw sessions        # list sessions
```

## Systemd Service (Linux/WSL2)

OpenClaw installs a **systemd user service** by default on Linux.

**Commands:**
- `openclaw gateway install` — creates the user unit
- `openclaw doctor` — audits and can update the unit

**User service** (single-user machines):
- Location: `~/.config/systemd/user/openclaw-gateway.service`
- Requires lingering: `sudo loginctl enable-linger youruser`
- Enable: `systemctl --user enable --now openclaw-gateway.service`

**System service** (always-on/multi-user servers):
- Location: `/etc/systemd/system/openclaw-gateway.service`
- No lingering needed
- Set `User=` and `WorkingDirectory=` in unit
- `WantedBy=multi-user.target`

**Key unit settings:**
```ini
[Service]
Restart=always
RestartSec=5
```

This is why the gateway kept restarting after crashes — systemd was doing its job.

## The Crash I Debugged

**Root cause:** Heartbeat configured with `ollama/llama3.2:3b` but API provider resolution failed → "No API provider registered for api: undefined" → Gateway crash every 30 minutes.

**Lesson:** The heartbeat model must be properly configured. If using local Ollama, ensure the provider is correctly registered in config. The gateway crashes hard on unhandled promise rejections during heartbeat runs.

## Community Wisdom (from Reddit/Twitter)

- "My OpenClaw checks in during heartbeats — a kinda awesome surprise! Love the proactive reaching out."
- "It's the fact that claw can just keep building upon itself just by talking to it"
- "Personal AI is getting real"
- People use SOUL.md to define personality, not just "helpful assistant"
- Multi-agent setups possible: one "Jarvis" orchestrator that manages specialist agents

---

## Our Customizations & Improvements

*Things we've added to make OpenClaw work better. May help others.*

### 1. Local Memory Search (Zero Cost Embeddings)

**Problem:** `memory_search` tool needs an embedding model. Default would use paid APIs (OpenAI/Gemini).

**Solution:** Configure local GGUF embeddings via node-llama-cpp.

**Config (`openclaw.json`):**
```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local"
      }
    }
  }
}
```

**Setup:**
```bash
openclaw configure --section memory
# Select "local" provider
# Model auto-downloads on first use
```

**Model location:** `~/.node-llama-cpp/models/hf_ggml-org_embeddinggemma-300M-Q8_0.gguf`

**Result:** Semantic search over memory files, zero API cost.

---

### 2. Brave Search API (Web Research)

**Problem:** Agent needs to look things up on the web for current info.

**Solution:** Enable `web_search` tool with Brave Search API key.

**Config (`openclaw.json`):**
```json5
{
  web: {
    brave: {
      apiKey: "your-api-key"
    }
  }
}
```

**Setup:**
```bash
openclaw configure --section web
# Enable web_search, paste API key
# Also enables web_fetch (keyless HTTP fetch)
```

**Get API key:** https://brave.com/search/api/

**Result:** `web_search` tool works for research, `web_fetch` for grabbing page content.

---

### 3. Heartbeat Model Fix (Ollama → Haiku)

**Problem:** Heartbeat with `ollama/llama3.2:3b` crashed Gateway. Error: "No API provider registered for api: undefined"

**Root cause:** Provider resolution fails in heartbeat context (possibly OpenClaw bug).

**Workaround:** Use Claude Haiku for heartbeats instead.

**Config:**
```json5
{
  agents: {
    defaults: {
      heartbeat: {
        model: "anthropic/claude-haiku-3-5"
      }
    }
  }
}
```

**Why Haiku:** Cheap (~$0.25/M tokens), fast, capable enough for HEARTBEAT.md checks.

**Status:** Ollama heartbeat issue unresolved. May report as bug.

---

### 4. Research Guidelines (AGENTS.md Addition)

**Added to AGENTS.md:**
```markdown
## Research

When researching factual claims (especially current events, stats, or unfamiliar topics), prefer web_search over training data. Cite sources when it matters.

Any claim based on web search must include:
- The exact search query used
- At least one URL returned

If this cannot be provided, state: "No verifiable web search was performed."
```

**Why:** Balance between being a research agent and being useful. Search when it matters, cite when helpful, don't turn into a search wrapper for everything.

---

### 5. Model Cost Awareness

**Philosophy:** API keys cost money. Prefer local/free options.

| Use Case | Model | Why |
|----------|-------|-----|
| Main conversation | Sonnet | Default, capable |
| Heartbeats | Haiku | Cheap, simple checks |
| Memory embeddings | Local GGUF | Zero cost |
| Complex/safety-critical | Opus | Only when needed |

---

## Tips for Others

1. **Check `openclaw status --all`** for full diagnosis when things break
2. **Gateway logs** show what's happening: watch for crash loops
3. **Systemd user service** needs linger enabled: `sudo loginctl enable-linger youruser`
4. **HEARTBEAT.md** is your agent's periodic checklist — keep it small to limit token burn
5. **Local embeddings** are worth setting up — memory search at zero cost
6. **Brave Search** free tier is generous (2000 queries/month)

---

*This file exists because I made the mistake of not understanding OpenClaw deeply enough. Read the docs at /home/george/.npm-global/lib/node_modules/openclaw/docs/ for authoritative information.*
