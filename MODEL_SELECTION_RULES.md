# MODEL_SELECTION_RULES.md

## Simplified Strategy

**Sonnet = Default**
Use `anthropic/claude-sonnet-4-5` for everything unless told otherwise.

**Opus = On Request**
Switch to Opus only when:
- Nick explicitly asks for it
- Genuinely safety-critical (security audit, production deployment)

**Ollama = Heartbeats**
Heartbeats run on `ollama/llama3.2:3b` (local, zero cost).

**Reality Check**
Don't overthink model selection. Stay on Sonnet unless there's a clear reason to switch up.
