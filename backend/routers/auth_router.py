from fastapi import APIRouter, HTTPException, Depends, status
from database import get_db
from schemas import UserSignup, UserLogin, AuthResponse, UserProfileResponse, UserOut
from auth import hash_password, verify_password, generate_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def signup(data: UserSignup):
    if not data.name.strip() or not data.email.strip() or not data.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Please enter all fields"}
        )
    
    email_clean = data.email.strip().lower()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email_clean,))
    existing_user = cursor.fetchone()
    if existing_user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "User already exists with this email"}
        )
    
    hashed_pw = hash_password(data.password)
    cursor.execute(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        (data.name.strip(), email_clean, hashed_pw)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    user_data = UserOut(id=user_id, name=data.name.strip(), email=email_clean)
    token = generate_token(user_id, email_clean, data.name.strip())
    
    return {
        "user": user_data,
        "token": token,
        "message": "Account created successfully"
    }

@router.post("/login", response_model=AuthResponse)
def login(data: UserLogin):
    if not data.email.strip() or not data.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Please enter email and password"}
        )
    
    email_clean = data.email.strip().lower()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email_clean,))
    user = cursor.fetchone()
    conn.close()
    
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
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
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
