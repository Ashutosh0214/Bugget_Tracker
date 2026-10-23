# Local development

Run the FastAPI backend from `backend` with
`..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`.
Run `npm run dev -- --host localhost --port 5173 --strictPort` from `budget_Tracker`.

The frontend defaults to `http://127.0.0.1:8000`. To configure another backend,
set `VITE_API_BASE_URL` in `budget_Tracker/.env.local` (see `.env.example`) and
restart Vite. This variable is public and must not contain credentials. Vite
does not read `backend/.env`. The URL may include a trailing `/api`; requests
include that prefix exactly once. Set the deployed frontend's Vite environment
to its deployed backend URL before building.

Backend secrets and database configuration remain in `backend/.env`.
`CORS_ORIGINS` is a comma-separated allowlist; its defaults include
`http://localhost:5173`, `http://127.0.0.1:5173`, and the existing production
frontend. If overriding it, include each frontend origin you intend to use.
The explicit Uvicorn port above takes precedence over the legacy `PORT` setting
used by `python main.py`.
