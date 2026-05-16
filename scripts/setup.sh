#!/bin/bash
set -e

echo "=== Claude Code on a Leash — Setup ==="

# Backend
echo "[1/3] Setting up backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet
mkdir -p data
cd ..

# .env
if [ ! -f backend/.env ]; then
  cp .env.example backend/.env
  echo "  Created backend/.env from .env.example"
fi

# Frontend
echo "[2/3] Setting up frontend..."
cd frontend
npm install --silent
cd ..

echo "[3/3] Done."
echo ""
echo "Start backend:  cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000"
echo "Start frontend: cd frontend && npm run dev"
echo "Seed demo data: python3 scripts/seed_logs.py"
echo "Run scenario:   cd sandbox && python3 run_demo.py --scenario prompt_injection_repo --mode use"
