import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _positive_int(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be greater than zero")
    return value


@dataclass(frozen=True)
class Settings:
    app_env: str
    jwt_secret: str
    jwt_expire_minutes: int
    cors_origins: tuple[str, ...]
    database_path: Path

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    app_env = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development")).strip()
    jwt_secret = os.getenv("JWT_SECRET", "").strip()
    if not jwt_secret:
        if app_env.lower() == "production":
            raise RuntimeError("JWT_SECRET is required in production")
        jwt_secret = "development-only-secret-change-before-deploying"
    if len(jwt_secret) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters")

    origins = tuple(
        origin.strip().rstrip("/")
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    )
    if "*" in origins:
        raise RuntimeError("CORS_ORIGINS cannot contain '*' when credentials are enabled")

    configured_db = Path(os.getenv("DATABASE_PATH", "spendzy.db"))
    database_path = configured_db if configured_db.is_absolute() else BASE_DIR / configured_db

    return Settings(
        app_env=app_env,
        jwt_secret=jwt_secret,
        jwt_expire_minutes=_positive_int("JWT_EXPIRE_MINUTES", 1440),
        cors_origins=origins,
        database_path=database_path.resolve(),
    )
