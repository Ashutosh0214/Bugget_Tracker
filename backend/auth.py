import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings
from database import db_connection

ALGORITHM = "HS256"

security = HTTPBearer()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_token(user_id: int, email: str, name: str, session_version: int | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(minutes=settings.jwt_expire_minutes)
    if session_version is None:
        with db_connection() as conn:
            user = conn.execute('SELECT session_version FROM users WHERE id=?', (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail='Account unavailable')
        session_version = user['session_version']
    payload = {
        "sub": str(user_id),
        "id": user_id,  # Retained for compatibility with the Express backend.
        "sv": session_version,
        "email": email,
        "name": name,
        "iat": now,
        "exp": expiration
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Not authorized, no token provided"}
        )
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub") or payload.get("id"))
        with db_connection() as conn:
            user = conn.execute('SELECT session_version FROM users WHERE id=?', (user_id,)).fetchone()
        # Legacy JWTs remain valid at version zero until that user's password resets.
        if not user or payload.get('sv', 0) != user['session_version']:
            raise HTTPException(status_code=401, detail='Session expired. Please log in again.')
        return {**payload, "id": user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Not authorized, token expired"}
        )
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Not authorized, token failed"}
        )
