from datetime import date as Date
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional, List

class UserSignup(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        # bcrypt operates on bytes, not Unicode characters. Never truncate passwords.
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes (some characters use multiple bytes).")
        return value

class UserLogin(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

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
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    amount: float = Field(ge=-1_000_000_000, le=1_000_000_000, allow_inf_nan=False)
    category: str = Field(default="General", min_length=1, max_length=60)
    date: Optional[Date] = None
    status: str = Field(default="Completed", min_length=1, max_length=30)
    icon: Optional[str] = Field(default=None, max_length=16)

    @field_validator("category", "status", mode="before")
    @classmethod
    def use_default_for_none(cls, value, info):
        if value is None:
            return cls.model_fields[info.field_name].default
        return value

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
