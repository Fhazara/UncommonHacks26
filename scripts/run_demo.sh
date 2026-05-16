#!/bin/bash
echo "Seeding demo data..."
python3 scripts/seed_logs.py --backend http://localhost:8000

echo ""
echo "Running prompt injection scenario..."
cd sandbox && python3 run_demo.py --scenario prompt_injection_repo --mode use --backend http://localhost:8000

echo ""
echo "Running cognitive drift scenario..."
python3 run_demo.py --scenario cognitive_drift_demo --mode use --backend http://localhost:8000

echo ""
echo "Dashboard: http://localhost:3000/dashboard"
