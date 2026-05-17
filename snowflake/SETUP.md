# Snowflake Setup for HCI Experiment Telemetry

## Prerequisites

- A Snowflake account (free trial works for development)
- A warehouse with at least X-Small size
- A user with SYSADMIN or equivalent privileges for initial setup

## 1. Run the schema script

In your Snowflake worksheet, paste and run the full contents of `snowflake/schema.sql`.

This creates:
- Database: `HCI_EXPERIMENTS`
- Schema: `TELEMETRY`
- Tables: `EXPERIMENTS`, `TELEMETRY_EVENTS`, `SESSION_SNAPSHOTS`
- Views: `ENGAGEMENT_METRICS`, `UNDERSTANDING_METRICS`, `AGENCY_METRICS`

## 2. Create a service user

```sql
USE ROLE SYSADMIN;

CREATE USER hci_service
    PASSWORD = '<choose a strong password>'
    DEFAULT_ROLE = hci_service_role
    DEFAULT_WAREHOUSE = COMPUTE_WH
    DEFAULT_NAMESPACE = HCI_EXPERIMENTS.TELEMETRY;

CREATE ROLE IF NOT EXISTS hci_service_role;

GRANT USAGE ON DATABASE HCI_EXPERIMENTS TO ROLE hci_service_role;
GRANT USAGE ON SCHEMA HCI_EXPERIMENTS.TELEMETRY TO ROLE hci_service_role;
GRANT INSERT, SELECT, UPDATE ON ALL TABLES IN SCHEMA HCI_EXPERIMENTS.TELEMETRY TO ROLE hci_service_role;
GRANT SELECT ON ALL VIEWS IN SCHEMA HCI_EXPERIMENTS.TELEMETRY TO ROLE hci_service_role;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE hci_service_role;
GRANT ROLE hci_service_role TO USER hci_service;
```

## 3. Configure environment variables

Add these to your `.env` file:

```
SNOWFLAKE_ENABLED=true
SNOWFLAKE_ACCOUNT=<your-account-identifier>
SNOWFLAKE_USER=hci_service
SNOWFLAKE_PASSWORD=<the password you set>
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=HCI_EXPERIMENTS
SNOWFLAKE_SCHEMA=TELEMETRY
```

Your account identifier format is usually `<orgname>-<account_name>` for newer accounts,
or `<account_locator>.<region>.<cloud>` for older ones. Find it in Snowflake under your
username (bottom-left) → Account.

## 4. Test the connection

From your backend virtualenv:

```bash
python3 -c "
import snowflake.connector, os
conn = snowflake.connector.connect(
    account=os.environ['SNOWFLAKE_ACCOUNT'],
    user=os.environ['SNOWFLAKE_USER'],
    password=os.environ['SNOWFLAKE_PASSWORD'],
    warehouse=os.environ['SNOWFLAKE_WAREHOUSE'],
    database=os.environ['SNOWFLAKE_DATABASE'],
    schema=os.environ['SNOWFLAKE_SCHEMA'],
)
print('Connected:', conn.cursor().execute('SELECT CURRENT_VERSION()').fetchone())
conn.close()
"
```

## 5. What gets loaded and when

Telemetry is collected locally in SQLite during the experiment. When an experiment ends
(manual stop, time limit, or task completion), the backend calls `export_experiment_to_snowflake()`
which bulk-inserts all events from SQLite into Snowflake in a single batch.

The views (`ENGAGEMENT_METRICS`, `UNDERSTANDING_METRICS`, `AGENCY_METRICS`) are computed
on-the-fly from `TELEMETRY_EVENTS` — no refresh or scheduling needed.

## 6. Example queries

Bug catch rate per experiment:

```sql
SELECT
    e.task_name,
    e.started_at,
    u.bug_catch_rate,
    u.avg_prediction_accuracy,
    u.avg_explanation_score
FROM HCI_EXPERIMENTS.TELEMETRY.UNDERSTANDING_METRICS u
JOIN HCI_EXPERIMENTS.TELEMETRY.EXPERIMENTS e USING (experiment_id)
ORDER BY e.started_at DESC;
```

Human vs agent authorship over time:

```sql
SELECT
    experiment_id,
    DATE_TRUNC('minute', occurred_at) AS minute_bucket,
    SUM(CASE WHEN raw_data:author = 'human' THEN raw_data:lines_added::INT ELSE 0 END) AS human_lines,
    SUM(CASE WHEN raw_data:author = 'agent' THEN raw_data:lines_added::INT ELSE 0 END) AS agent_lines
FROM HCI_EXPERIMENTS.TELEMETRY.TELEMETRY_EVENTS
WHERE event_type = 'file_edit'
GROUP BY 1, 2
ORDER BY 2;
```
