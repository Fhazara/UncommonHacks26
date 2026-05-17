CREATE DATABASE IF NOT EXISTS HCI_EXPERIMENTS;
USE DATABASE HCI_EXPERIMENTS;

CREATE SCHEMA IF NOT EXISTS TELEMETRY;
USE SCHEMA TELEMETRY;

CREATE TABLE IF NOT EXISTS EXPERIMENTS (
    experiment_id       VARCHAR(36)   NOT NULL PRIMARY KEY,
    status              VARCHAR(20)   NOT NULL,
    nl_description      TEXT,
    task_name           VARCHAR(500),
    task_description    TEXT,
    judge_persona       TEXT,
    model               VARCHAR(100),
    starter_code_source VARCHAR(20),
    github_url          TEXT,
    created_at          TIMESTAMP_TZ,
    started_at          TIMESTAMP_TZ,
    ended_at            TIMESTAMP_TZ
);

CREATE TABLE IF NOT EXISTS TELEMETRY_EVENTS (
    event_id        VARCHAR(36)   NOT NULL PRIMARY KEY,
    experiment_id   VARCHAR(36)   NOT NULL REFERENCES EXPERIMENTS(experiment_id),
    session_id      VARCHAR(36)   NOT NULL,
    event_type      VARCHAR(100)  NOT NULL,
    occurred_at     TIMESTAMP_TZ  NOT NULL,
    raw_data        VARIANT       NOT NULL
);

CREATE VIEW IF NOT EXISTS ENGAGEMENT_METRICS AS
SELECT
    e.experiment_id,
    e.session_id,
    AVG(t.raw_data:response_time_ms::FLOAT) AS avg_response_time_ms,
    SUM(CASE WHEN t.event_type = 'human_edit_of_agent_code' THEN 1 ELSE 0 END)::FLOAT
        / NULLIF(SUM(CASE WHEN t.event_type = 'agent_output' THEN 1 ELSE 0 END), 0)
        AS edit_rate,
    AVG(CASE WHEN t.event_type = 'diff_view' THEN t.raw_data:scroll_depth_pct::FLOAT END)
        AS avg_diff_scroll_depth_pct,
    SUM(CASE WHEN t.event_type = 'override' THEN 1 ELSE 0 END) AS override_count
FROM TELEMETRY_EVENTS t
JOIN EXPERIMENTS e ON t.experiment_id = e.experiment_id
GROUP BY e.experiment_id, e.session_id;

CREATE VIEW IF NOT EXISTS UNDERSTANDING_METRICS AS
SELECT
    experiment_id,
    session_id,
    AVG(raw_data:prediction_accuracy::FLOAT)  AS avg_prediction_accuracy,
    AVG(raw_data:explanation_score::FLOAT)    AS avg_explanation_score,
    AVG(raw_data:confidence_rating::FLOAT)    AS avg_self_confidence,
    SUM(CASE WHEN raw_data:bug_injected::BOOLEAN AND raw_data:bug_caught::BOOLEAN THEN 1 ELSE 0 END)::FLOAT
        / NULLIF(SUM(CASE WHEN raw_data:bug_injected::BOOLEAN THEN 1 ELSE 0 END), 0)
        AS bug_catch_rate
FROM TELEMETRY_EVENTS
WHERE event_type = 'judge_interaction'
GROUP BY experiment_id, session_id;

CREATE VIEW IF NOT EXISTS AGENCY_METRICS AS
SELECT
    experiment_id,
    session_id,
    SUM(CASE WHEN raw_data:author = 'human' THEN raw_data:lines_added::INT ELSE 0 END)   AS human_lines,
    SUM(CASE WHEN raw_data:author = 'agent' THEN raw_data:lines_added::INT ELSE 0 END)   AS agent_lines,
    SUM(CASE WHEN raw_data:initiated_by = 'human' THEN 1 ELSE 0 END)                     AS human_initiated_tasks,
    SUM(CASE WHEN raw_data:initiated_by = 'agent' THEN 1 ELSE 0 END)                     AS agent_initiated_tasks,
    SUM(CASE WHEN event_type = 'override' THEN 1 ELSE 0 END)                              AS total_overrides
FROM TELEMETRY_EVENTS
WHERE event_type IN ('file_edit', 'override')
GROUP BY experiment_id, session_id;

CREATE TABLE IF NOT EXISTS SESSION_SNAPSHOTS (
    snapshot_id         VARCHAR(36)   NOT NULL PRIMARY KEY,
    experiment_id       VARCHAR(36)   NOT NULL REFERENCES EXPERIMENTS(experiment_id),
    session_id          VARCHAR(36)   NOT NULL,
    captured_at         TIMESTAMP_TZ  NOT NULL,
    elapsed_seconds     INT,
    engagement_score    FLOAT,
    focus_file          TEXT,
    agent_lines_so_far  INT,
    human_lines_so_far  INT,
    override_count      INT,
    raw_snapshot        VARIANT
);
