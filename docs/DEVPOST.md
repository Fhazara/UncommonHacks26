# Devpost Writeup — Claude Code on a Leash

## Inspiration

AI coding agents like Claude Code and Cursor can autonomously read files, run shell commands,
install packages, and push to git remotes. They're powerful. But as they become more capable,
two problems compound:

1. The agent itself might attempt something dangerous — reading secrets, following malicious
   README instructions, exfiltrating code to an attacker's URL.
2. The human stops meaningfully supervising. When the first few actions seem correct, users
   begin blindly clicking approve without reading diffs or understanding what's happening.

We realized that **current AI coding tools assume human approval equals human understanding.
That assumption is false.**

## What It Does

**Claude Code on a Leash** is a safety, comprehension, and telemetry layer for AI coding agents.

It intercepts proposed agent actions and asks four questions:
1. Is the proposed action technically safe?
2. Does the human user actually understand what they're approving?
3. Is the user drifting into passive approval?
4. Should the system allow, warn, ask a reflection question, or block?

### Core Components

**Policy Engine** — Deterministic YAML rules that detect dangerous patterns:
- `rm -rf`, `sudo`, `chmod 777`, `curl | bash`
- `.env` reads, SSH key reads
- Data exfiltration via curl/wget
- Prompt injection phrases in agent plans or READMEs
- Typosquatted npm packages (`reacct`, `lodahs`)
- Force pushes, path traversal, auth file edits

**Cognitive Drift Engine** — Measures whether the user is meaningfully supervising by scoring:
- Approval speed (under 2 seconds = +20 drift points)
- Whether the diff was viewed (+30 if skipped)
- Repeated fast approvals (+20 for 3+ in a row)
- Scroll depth, keystroke activity, explanation engagement

**Teacher/Interpreter Model** — A smaller model (or rule-based fallback) that explains what the
coding agent is trying to do in plain English, generates a reflection question, and suggests a
safer alternative. This is not the safety decision — it's the explanation.

**Intervention Engine** — Combines `action_risk_score + cognitive_drift_score + intent_mismatch_score`
into a final decision: allow (0–24), warn (25–59), reflect (60–99), or block (100+).

**Two Modes**:
- **Research Mode**: Observes, scores, and logs. Never blocks. Records `would_warn/would_reflect/would_block` for telemetry research.
- **Use Mode**: Actively enforces. Blocks critical actions. Forces reflection before high-risk approvals.

## How We Built It

- **FastAPI** backend with a YAML-driven policy engine, pure-Python cognitive drift scorer, and optional OpenAI teacher model
- **Next.js + TypeScript + Tailwind** dark cybersecurity dashboard with real-time action timeline, drift meter, and reflection prompt UI
- **SQLite + JSONL** local logging — always works offline
- **Sandbox** — Python CLI that generates realistic attack scenarios and sends them to the backend
- **Optional integrations**: Snowflake (research analytics), Wafer (real-time telemetry), OpenAI (teacher model)

## Challenges

The hardest part was making the cognitive drift detection nuanced. Too sensitive = every approval triggers a reflection. Too lenient = drift goes undetected. We balanced it with positive signals (keystroke count, scroll depth) reducing the score, not just additive penalties.

We also had to make every external integration (Snowflake, Wafer, OpenAI) degrade gracefully — the demo must work without any of them.

## Accomplishments

- Built a working policy engine with 14 rules in one day
- Cognitive drift engine that correctly classifies "passive approval" from approval telemetry alone
- A live dashboard that shows exactly why an action was blocked, in plain English
- Five repeatable sandbox scenarios including a live prompt injection demo

## What We Learned

Human cognitive drift is the underappreciated half of AI safety. Everyone focuses on agent behavior. Fewer people study how human supervisors degrade over time as agents appear more competent.

The research literature on automation bias shows this is real. Our system begins to measure it.

## What's Next

1. Real Claude Code hook integration (PreToolUse events → our backend)
2. MCP safety gateway for file/shell/git/package-manager tools
3. Longitudinal research study: does our intervention restore meaningful oversight?
4. ML-based drift detection trained on real user session telemetry
5. Per-user skill calibration — beginner vs advanced thresholds

---

**Repo:** https://github.com/Fhazara/UncommonHacks26

**Built for UncommonHacks 2026**
