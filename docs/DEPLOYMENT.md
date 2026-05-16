# Deployment Guide

## Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → Import Project → GitHub → `Fhazara/UncommonHacks26`
2. Root Directory: `frontend`
3. Framework: Next.js (auto-detected)
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```
5. Deploy.

## Backend — Render

1. Go to [render.com](https://render.com) → New Web Service → GitHub → `Fhazara/UncommonHacks26`
2. Root Directory: `backend`
3. Runtime: Python 3
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Environment Variables:
   ```
   FIREWALL_MODE=research
   ALLOW_AI_EVALUATOR=false
   CORS_ORIGINS=https://your-vercel-url.vercel.app
   SNOWFLAKE_ENABLED=false
   WAFER_ENABLED=false
   ```
7. Deploy.

## Update Frontend API URL

After backend deploys, copy the Render URL (e.g. `https://leash-api.onrender.com`).
In Vercel → Settings → Environment Variables → update `NEXT_PUBLIC_API_URL`.
Redeploy frontend.

## Local Fallback (Always Works)

```bash
# Terminal 1 — Backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev

# Terminal 3 — Demo
python3 scripts/seed_logs.py
cd sandbox && python3 run_demo.py --scenario prompt_injection_repo --mode use
```

Open http://localhost:3000/dashboard

## Snowflake (Optional)

Set in backend `.env`:
```
SNOWFLAKE_ENABLED=true
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_user
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=LEASH_DB
SNOWFLAKE_SCHEMA=PUBLIC
```

Create the table first (see docs/SNOWFLAKE.md).

## Wafer (Optional)

Set in backend `.env`:
```
WAFER_ENABLED=true
WAFER_API_KEY=your_key
WAFER_ENDPOINT=https://your-wafer-endpoint/events
```
