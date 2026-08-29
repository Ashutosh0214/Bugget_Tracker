from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3

from database import db_connection
from schemas import UserSignup, UserLogin, AuthResponse, UserProfileResponse, UserOut
from auth import hash_password, verify_password, generate_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def signup(data: UserSignup):
    email_clean = str(data.email).lower()
    hashed_pw = hash_password(data.password)
    try:
        with db_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                (data.name, email_clean, hashed_pw)
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "User already exists with this email"}
        )
    
    user_data = UserOut(id=user_id, name=data.name, email=email_clean)
    token = generate_token(user_id, email_clean, data.name)
    
    return {
        "user": user_data,
        "token": token,
        "message": "Account created successfully"
    }

@router.post("/login", response_model=AuthResponse)
def login(data: UserLogin):
    email_clean = str(data.email).lower()
    with db_connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email_clean,)).fetchone()
    
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid email or password"}
        )
    
    user_data = UserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        created_at=str(user["created_at"]) if user["created_at"] else None
    )
    token = generate_token(user["id"], user["email"], user["name"])
    
    return {
        "user": user_data,
        "token": token,
        "message": "Logged in successfully"
    }

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    with db_connection() as conn:
        user = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "User not found"}
        )
    
    user_data = UserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        created_at=str(user["created_at"]) if user["created_at"] else None
    )
    return {"user": user_data}
