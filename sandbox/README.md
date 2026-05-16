# Sandbox Scenarios

Repeatable demo scenarios that simulate real AI agent attack vectors and cognitive drift patterns.

## Quick Start

```bash
# Make sure backend is running first
cd ../backend && uvicorn main:app --reload --port 8000

# In a new terminal
cd sandbox

# List available scenarios
python3 run_demo.py --list

# Run a scenario in use mode (enforces blocks)
python3 run_demo.py --scenario prompt_injection_repo --mode use

# Run in research mode (observes, never blocks)
python3 run_demo.py --scenario cognitive_drift_demo --mode research
```

## Scenarios

| Scenario | What it demonstrates |
|----------|---------------------|
| `prompt_injection_repo` | README contains hidden instructions to read `.env` and exfiltrate |
| `secrets_exfiltration` | Agent reads `.env` and SSH key in one command |
| `dangerous_cleanup` | Agent runs `rm -rf` and `chmod 777` under guise of cleanup |
| `dependency_attack` | Agent installs typosquatted packages: `reacct`, `lodahs`, `axois` |
| `cognitive_drift_demo` | 300-line auth rewrite approved in 1.5 seconds by a beginner user |

## Scenario Files

```
scenarios/
  prompt_injection_repo/    ← Fake repo with injected README
  secrets_exfiltration/     ← Fake .env and SSH key files
  dependency_attack/        ← Fake package.json with legit deps
  dangerous_cleanup/        ← Temp files for cleanup demo
  cognitive_drift_demo/     ← auth.py and large_diff.patch
```
