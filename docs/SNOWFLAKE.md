# Snowflake Integration

## Setup

### 1. Create Snowflake account
Free trial at [snowflake.com](https://snowflake.com)

### 2. Create database and table

```sql
CREATE DATABASE LEASH_DB;
CREATE SCHEMA LEASH_DB.PUBLIC;

CREATE TABLE LEASH_DB.PUBLIC.interaction_events (
    event_id STRING,
    session_id STRING,
    timestamp TIMESTAMP,
    mode STRING,
    user_prompt STRING,
    latest_user_instruction STRING,
    agent_stated_plan STRING,
    agent_action_type STRING,
    command STRING,
    file_path STRING,
    lines_changed INTEGER,
    files_changed_count INTEGER,
    approval_time_ms INTEGER,
    diff_viewed BOOLEAN,
    explanation_viewed BOOLEAN,
    keystroke_count INTEGER,
    scroll_depth_percent FLOAT,
    user_skill_level STRING,
    action_risk_score INTEGER,
    cognitive_drift_score INTEGER,
    intent_mismatch_score INTEGER,
    intervention_score INTEGER,
    triggered_rules VARIANT,
    decision STRING,
    intervention_type STRING,
    reflection_question STRING,
    reflection_answer STRING,
    reflection_answer_quality INTEGER,
    safe_alternative STRING,
    outcome STRING
);
```

### 3. Configure backend .env

```
SNOWFLAKE_ENABLED=true
SNOWFLAKE_ACCOUNT=abc12345.us-east-1
SNOWFLAKE_USER=myuser
SNOWFLAKE_PASSWORD=mypassword
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=LEASH_DB
SNOWFLAKE_SCHEMA=PUBLIC
```

### 4. Install connector

Already in requirements.txt. Or: `pip install snowflake-connector-python`

### 5. Batch export

```bash
python3 scripts/export_snowflake.py --logs backend/data/action_logs.jsonl
```

## Research Queries

```sql
-- Average drift score by user skill level
SELECT user_skill_level, AVG(cognitive_drift_score) as avg_drift
FROM interaction_events
GROUP BY user_skill_level;

-- Actions blocked vs allowed
SELECT decision, COUNT(*) FROM interaction_events GROUP BY decision;

-- Sessions where user approved critical-risk actions
SELECT session_id, COUNT(*) as risky_approvals
FROM interaction_events
WHERE action_risk_score > 80
  AND decision != 'block'
GROUP BY session_id
ORDER BY risky_approvals DESC;

-- Approval time distribution
SELECT
    AVG(approval_time_ms) as avg_approval_ms,
    MIN(approval_time_ms) as min_ms,
    MAX(approval_time_ms) as max_ms
FROM interaction_events;
```

## Graceful Fallback

If Snowflake is not configured or fails, the app continues normally.
All events always write to local `data/action_logs.jsonl` and `data/firewall.db`.
