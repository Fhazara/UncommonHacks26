# AgentFirewall — Policy Design Document

## Policy Structure

Each policy rule is defined in YAML with the following fields:

```yaml
rule_id: unique_snake_case_identifier
name: "Human-readable rule name"
description: "What this rule catches and why it matters"
severity: low | medium | high | critical
conditions:
  - field: command | file_path | url | package_name | diff | action_type | actor
    operator: contains | equals | regex | startswith | not_contains | endswith
    value: "string to match"
risk_points: 0-50  # points added to risk score when this rule triggers
action_override: allow | warn | block | null  # null = use score-based decision
safer_alternative: "What the agent should do instead"
enabled: true | false
mode_restriction: research | use | null  # null = applies in all modes
```

---

## How Policies Are Evaluated

The `PolicyEngine` iterates all enabled policies in order. For each policy:

1. If `mode_restriction` is set and does not match the action's mode, skip.
2. Evaluate all conditions. **All conditions must match** (AND logic) for the rule to trigger.
3. If triggered, create a `PolicyMatch` with evidence, risk_points, and safer_alternative.

After all policies are evaluated, the `RiskScorer` sums the risk points and determines the final decision.

### Condition Evaluation

Each condition checks a single field of the `ActionEvent`:

| Field | Checked Against |
|---|---|
| `command` | The shell command string |
| `file_path` | The file path being read/written |
| `url` | The URL for network requests |
| `package_name` | The package being installed |
| `diff` | The file diff content |
| `action_type` | The type of action (shell_command, file_write, etc.) |
| `actor` | The name of the AI agent |

Supported operators:
- `contains` — substring match (case-insensitive)
- `not_contains` — inverse substring match
- `equals` — exact match
- `startswith` — prefix match
- `endswith` — suffix match
- `regex` — full Python regex match

---

## Severity Levels

| Level | Risk Points Range | Meaning |
|---|---|---|
| `low` | 1–10 | Minor concern, informational |
| `medium` | 11–25 | Should be reviewed, may warn |
| `high` | 26–40 | Likely dangerous, will warn or block |
| `critical` | 41–50 | Extremely dangerous, will block |

---

## Decision Thresholds

Risk score is calculated as: `sum(risk_points) + action_type_modifier + mode_modifier`

**Use Mode** (agent is executing):
| Score | Decision |
|---|---|
| 0–29 | allow |
| 30–60 | warn |
| 61–100 | block |

**Research Mode** (agent is exploring):
| Score | Decision |
|---|---|
| 0–39 | allow |
| 40–70 | warn |
| 71–100 | block |

**Mode Modifiers:**
- Use mode: +15 points
- Research mode: -5 points

**Action Type Modifiers:**
- `shell_command`: +10
- `network_request`: +8
- `dependency_install`: +7
- `file_write`: +5
- `git_operation`: +2
- `file_read`: 0
- `plan_message`: -5

---

## Default Policies

### 1. `no_env_write` — No .env File Writes
```yaml
severity: critical
conditions:
  - field: file_path
    operator: contains
    value: ".env"
  - field: action_type
    operator: equals
    value: file_write
risk_points: 50
safer_alternative: "Use a secrets manager (Vault, AWS Secrets Manager) instead of writing secrets to .env"
```

### 2. `no_curl_external` — No curl/wget to External URLs
```yaml
severity: high
conditions:
  - field: command
    operator: regex
    value: "(curl|wget)\\s+https?://(?!localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0)"
risk_points: 35
safer_alternative: "Use approved internal APIs or add the domain to the allowlist"
```

### 3. `rm_recursive` — No Recursive Delete
```yaml
severity: critical
conditions:
  - field: command
    operator: regex
    value: "rm\\s+(-[rf]+\\s+|--recursive\\s+|--force\\s+)"
risk_points: 50
safer_alternative: "Move files to a temp directory first, or use git clean -fd for tracked files"
```

### 4. `secrets_in_command` — Secrets Patterns in Commands
```yaml
severity: critical
conditions:
  - field: command
    operator: regex
    value: "(AWS_SECRET|AWS_ACCESS_KEY|password\\s*=|token\\s*=|api_key\\s*=|@\\.env)"
risk_points: 50
safer_alternative: "Use environment variable injection via your shell profile, not inline in commands"
```

### 5. `suspicious_package` — Typosquatted Package Names
```yaml
severity: high
conditions:
  - field: package_name
    operator: regex
    value: "(lodahs|reqeusts|panda[^s]|nunmpy|matplotlb|expresss|reacts)"
risk_points: 35
safer_alternative: "Verify the exact package name at npmjs.com or pypi.org before installing"
```

### 6. `no_git_force_push` — No Force Push
```yaml
severity: medium
conditions:
  - field: command
    operator: contains
    value: "git push"
  - field: command
    operator: regex
    value: "(--force|-f\\b)"
risk_points: 20
safer_alternative: "Use --force-with-lease instead of --force to avoid overwriting others' work"
```

### 7. `no_chmod_777` — No World-Writable Permissions
```yaml
severity: medium
conditions:
  - field: command
    operator: regex
    value: "chmod\\s+(777|a\\+rwx|ugo\\+rwx)"
risk_points: 20
safer_alternative: "Use chmod 755 for executables or 644 for regular files"
```

### 8. `network_in_use_mode` — Network Request in Use Mode
```yaml
severity: medium
mode_restriction: use
conditions:
  - field: action_type
    operator: equals
    value: network_request
risk_points: 15
safer_alternative: "Verify the endpoint is on the approved list before making network requests in use mode"
```

### 9. `large_file_delete` — Mass File Deletion
```yaml
severity: high
conditions:
  - field: command
    operator: regex
    value: "find\\s+.+(--delete|-exec\\s+rm)"
risk_points: 35
safer_alternative: "Preview what find would delete first: run without --delete, then confirm"
```

### 10. `no_ssh_key_write` — No SSH Key File Writes
```yaml
severity: critical
conditions:
  - field: file_path
    operator: regex
    value: "~/.ssh/|/home/[^/]+/.ssh/"
  - field: action_type
    operator: equals
    value: file_write
risk_points: 50
safer_alternative: "Manage SSH keys manually or through a dedicated secrets manager"
```

---

## Adding Custom Policies

### YAML Format
Add a new entry to `backend/app/policies/default_policies.yaml`:

```yaml
- rule_id: no_prod_deploy_friday
  name: "No Production Deploys on Friday"
  description: "Warns when a production deployment is initiated on a Friday"
  severity: medium
  conditions:
    - field: command
      operator: contains
      value: "deploy"
    - field: command
      operator: contains
      value: "prod"
  risk_points: 20
  action_override: warn
  safer_alternative: "Schedule the deployment for Monday. Friday deploys are high-risk."
  enabled: true
  mode_restriction: use
```

Then reload via API:
```bash
curl -X POST http://localhost:8000/api/policies/reload
```

Or via the frontend: Policies page → **Reload Policies** button.

### API Format
You can also create policies via the API (stored in SQLite):
```bash
curl -X POST http://localhost:8000/api/policies \
  -H "Content-Type: application/json" \
  -d '{"rule_id": "no_prod_deploy_friday", "name": "...", ...}'
```

---

## Research vs. Use Mode Differences

| Aspect | Research Mode | Use Mode |
|---|---|---|
| Thresholds | Relaxed (block >70) | Strict (block >60) |
| Score modifier | -5 points | +15 points |
| Network requests | Allowed with warning | Warned by default policy |
| Intent | Agent is reading/planning | Agent is writing/executing |
| Use case | Code review, understanding | Code generation, execution |

**Example:** An agent reads a file containing a password (risk_points=30):
- Research mode: score ≈ 25 → allow (agent is just reading, not doing harm)
- Use mode: score ≈ 55 → warn (agent is in action mode, reading secrets is suspicious)
