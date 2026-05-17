python3 -c "
import snowflake.connector
conn = snowflake.connector.connect(
    account='YWVGRTY-RI27687',
    user='ameya',
    password='ILoveFinnFun20',
    warehouse='COMPUTE_WH',
    database='LEASH',
    schema='TELEMETRY'
)
cur = conn.cursor()

print('=== LEASH RESEARCH TELEMETRY ===')
print()

print('1. Decision breakdown:')
cur.execute('SELECT decision, COUNT() as n FROM INTERACTION_EVENTS GROUP BY decision ORDER BY n DESC')
for row in cur.fetchall():
    print(f'   {row[0]}: {row[1]}')

print()
print('2. Avg cognitive drift by decision:')
cur.execute('SELECT decision, ROUND(AVG(cognitive_drift_score),1) as avg_drift FROM INTERACTION_EVENTS GROUP BY decision ORDER BY avg_drift DESC')
for row in cur.fetchall():
    print(f'   {row[0]}: drift={row[1]}')

print()
print('3. Fast approval rate (approved in under 2 seconds):')
cur.execute('SELECT COUNT() as fast, (SELECT COUNT() FROM INTERACTION_EVENTS) as total FROM INTERACTION_EVENTS WHERE approval_time_ms < 2000')
row = cur.fetchone()
print(f'   {row[0]} of {row[1]} actions approved in under 2s ({round(row[0]/row[1]100)}%)')

print()
print('4. Top triggered rules:')
cur.execute('SELECT triggered_rule_ids, COUNT(*) as n FROM INTERACTION_EVENTS WHERE triggered_rule_ids != '' GROUP BY triggered_rule_ids ORDER BY n DESC LIMIT 5')
for row in cur.fetchall():
    print(f'   {row[0]}: {row[1]}x')

print()
print('5. Avg scores overall:')
cur.execute('SELECT ROUND(AVG(action_risk_score),1), ROUND(AVG(cognitive_drift_score),