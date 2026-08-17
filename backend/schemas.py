from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    user: UserOut
    token: str
    message: str

class UserProfileResponse(BaseModel):
    user: UserOut

class TransactionCreate(BaseModel):
    name: str
    amount: float
    category: Optional[str] = "General"
    date: Optional[str] = None
    status: Optional[str] = "Completed"
    icon: Optional[str] = None

class TransactionOut(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    amount: float
    date: str
    status: str
    icon: str
    created_at: str

class TransactionResponse(BaseModel):
    transaction: TransactionOut

class TransactionListResponse(BaseModel):
    transactions: List[TransactionOut]

class DeleteResponse(BaseModel):
    message: str
    id: int
