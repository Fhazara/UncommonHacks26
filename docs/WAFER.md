# Wafer Integration

Wafer is an optional real-time telemetry and observability layer.
The app works fully without it — all data is logged locally to SQLite/JSONL first.

## Setup

### 1. Configure .env

```
WAFER_ENABLED=true
WAFER_API_KEY=your_wafer_key_here
WAFER_ENDPOINT=https://your-wafer-endpoint/events
```

### 2. Event Format

Every action evaluation sends this payload:

```json
{
  "event_type": "action_blocked",
  "session_id": "sess_abc123",
  "user_prompt": "Fix the login bug",
  "agent_action": "cat .env",
  "action_type": "shell_command",
  "action_risk_score": 95,
  "cognitive_drift_score": 70,
  "intent_mismatch_score": 10,
  "intervention_score": 175,
  "decision": "block",
  "enforcement": "blocked",
  "mode": "use",
  "severity": "critical",
  "triggered_rules": ["RULE_ENV_READ", "RULE_EXFIL_CURL"]
}
```

### 3. Event Types

| event_type | Trigger |
|---|---|
| `action_allowed` | Low-risk action, approved |
| `action_warned` | Medium-risk action, warning shown |
| `action_would_warn` | Research mode warn |
| `action_reflection_required` | High-risk, reflection loop triggered |
| `action_would_reflect` | Research mode reflect |
| `action_blocked` | Critical action, blocked in use mode |
| `action_would_block` | Research mode block |

### 4. Graceful Fallback

If Wafer is unavailable or the API key is wrong:
- Exception is caught and logged to console
- App continues normally
- Event is still written to local SQLite/JSONL

## Note

Wafer integration is optional and depends on Wafer's sponsor API.
The `wafer_exporter.py` implementation is a generic HTTP poster that can
be adapted to any telemetry endpoint with the same pattern.
