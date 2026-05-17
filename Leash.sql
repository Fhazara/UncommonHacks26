-- ============================================================================
-- 1. DATABASE & SCHEMA SETUP
-- ============================================================================
CREATE DATABASE IF NOT EXISTS LEASH;
CREATE SCHEMA IF NOT EXISTS LEASH.TELEMETRY;
USE DATABASE LEASH;
USE SCHEMA TELEMETRY;

-- ============================================================================
-- 2. CORE TELEMETRY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS LEASH.TELEMETRY.INTERACTION_EVENTS (
  event_id VARCHAR,
  session_id VARCHAR,
  timestamp TIMESTAMP,
  mode VARCHAR,
  action_type VARCHAR,
  command VARCHAR,
  file_path VARCHAR,
  user_skill_level VARCHAR,
  approval_time_ms INTEGER,
  diff_viewed BOOLEAN,
  explanation_viewed BOOLEAN,
  fast_approvals_in_row INTEGER,
  action_risk_score INTEGER,
  cognitive_drift_score INTEGER,
  intent_mismatch_score INTEGER,
  intervention_score INTEGER,
  decision VARCHAR,
  enforcement VARCHAR,
  severity VARCHAR,
  triggered_rule_ids VARCHAR,
  plain_english_summary VARCHAR,
  safer_alternative VARCHAR
);

-- ============================================================================
-- 3. ANALYTICS & MONITORING VIEWS
-- ============================================================================

-- View 1: Session Risk Summary (Aggregated metrics per session)
CREATE OR REPLACE VIEW LEASH.TELEMETRY.SESSION_RISK_SUMMARY AS
SELECT 
    session_id,
    COUNT(event_id) AS total_actions,
    AVG(action_risk_score) AS avg_risk_score,
    MAX(action_risk_score) AS max_risk_score,
    AVG(cognitive_drift_score) AS avg_cognitive_drift,
    SUM(CASE WHEN decision = 'BLOCKED' THEN 1 ELSE 0 END) AS total_blocked_actions,
    SUM(CASE WHEN enforcement = 'INTERVENTION' THEN 1 ELSE 0 END) AS total_interventions
FROM LEASH.TELEMETRY.INTERACTION_EVENTS
GROUP BY session_id;

-- View 2: High Risk Alerts (Flashing dangerous commands and critical items)
CREATE OR REPLACE VIEW LEASH.TELEMETRY.HIGH_RISK_ALERTS AS
SELECT 
    timestamp,
    session_id,
    command,
    action_risk_score,
    triggered_rule_ids,
    plain_english_summary
FROM LEASH.TELEMETRY.INTERACTION_EVENTS
WHERE action_risk_score >= 70 OR severity = 'HIGH'
ORDER BY timestamp DESC;

-- ============================================================================
-- 4. ROLES, USER, & PERMISSIONS SETUP
-- ============================================================================
USE ROLE SYSADMIN;

-- Create the role if it doesn't exist
CREATE ROLE IF NOT EXISTS hci_service_role;

-- Grant structure permissions for the new LEASH database
GRANT USAGE ON DATABASE LEASH TO ROLE hci_service_role;
GRANT USAGE ON SCHEMA LEASH.TELEMETRY TO ROLE hci_service_role;

-- Grant data permissions on tables and new views
GRANT INSERT, SELECT, UPDATE ON ALL TABLES IN SCHEMA LEASH.TELEMETRY TO ROLE hci_service_role;
GRANT SELECT ON ALL VIEWS IN SCHEMA LEASH.TELEMETRY TO ROLE hci_service_role;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE hci_service_role;

-- Safely handle user configuration
CREATE USER IF NOT EXISTS hci_service
    PASSWORD = '<STRONG_PASSWORD>'
    DEFAULT_ROLE = hci_service_role
    DEFAULT_WAREHOUSE = COMPUTE_WH
    DEFAULT_NAMESPACE = LEASH.TELEMETRY
    MUST_CHANGE_PASSWORD = FALSE;

-- Ensure an existing user's default namespace is updated to LEASH
ALTER USER hci_service SET DEFAULT_NAMESPACE = LEASH.TELEMETRY;

-- Attach role to user
GRANT ROLE hci_service_role TO USER hci_service;

-- ============================================================================
-- 5. VERIFICATION & TESTING QUERIES
-- ============================================================================
USE ROLE ACCOUNTADMIN;
USE DATABASE LEASH;
USE SCHEMA TELEMETRY;

-- Verify all database schema objects exist (Expects: 1 Table, 2 Views)
SHOW TABLES IN SCHEMA LEASH.TELEMETRY;
SHOW VIEWS IN SCHEMA LEASH.TELEMETRY;

-- Test Query 1: Direct recent event check
SELECT command, decision, action_risk_score, cognitive_drift_score 
FROM LEASH.TELEMETRY.INTERACTION_EVENTS 
ORDER BY timestamp DESC 
LIMIT 10;

-- Test Query 2: Analytical view validation
SELECT * FROM LEASH.TELEMETRY.SESSION_RISK_SUMMARY LIMIT 5;