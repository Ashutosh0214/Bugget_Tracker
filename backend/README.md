# Spendzy FastAPI backend

This is the maintained API implementation. The Express files are legacy and
should not be started at the same time because both services use port 5000 and
the same SQLite database.

## Setup

1. Create and activate a Python virtual environment.
2. Run `python -m pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a random value.
4. Run `uvicorn main:app --reload --port 5000`.

API documentation is served at `http://localhost:5000/docs`.

Run tests from the repository root with:

```text
python -m pytest backend/tests -q
```

Tests use a temporary SQLite database and never modify `spendzy.db`.
