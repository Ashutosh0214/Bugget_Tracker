import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-at-least-32-characters")
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    import config
    config.get_settings.cache_clear()

    if "main" in sys.modules:
        app_module = importlib.reload(sys.modules["main"])
    else:
        app_module = importlib.import_module("main")

    with TestClient(app_module.app) as test_client:
        yield test_client

    config.get_settings.cache_clear()


def create_user(client, suffix="one"):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": f"User {suffix}",
            "email": f"{suffix}@example.com",
            "password": "secure-password",
        },
    )
    assert response.status_code == 201
    return response.json()
