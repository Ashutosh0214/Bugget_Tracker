from datetime import date as Date
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Literal

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

class TransactionUpdate(TransactionCreate):
    pass

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
    source: str = "manual"

class TransactionResponse(BaseModel):
    transaction: TransactionOut

class TransactionListResponse(BaseModel):
    transactions: List[TransactionOut]


class MonthlySetupTransaction(TransactionCreate):
    date: Date

    @field_validator("amount")
    @classmethod
    def amount_must_be_non_zero(cls, value: float) -> float:
        if value == 0:
            raise ValueError("Monthly setup transaction amount must be non-zero")
        return value


class BulkTransactionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2200)
    transactions: List[MonthlySetupTransaction] = Field(min_length=1, max_length=30)
    allow_duplicates: bool = False

    @model_validator(mode="after")
    def transaction_dates_match_period(self):
        if any(item.date.month != self.month or item.date.year != self.year for item in self.transactions):
            raise ValueError("Every transaction date must match the selected month and year")
        return self


class BulkTransactionResponse(BaseModel):
    transactions: List[TransactionOut]
    count: int
    message: str

class DeleteResponse(BaseModel):
    message: str
    id: int


class BudgetCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    category: str = Field(min_length=1, max_length=60)
    amount: float = Field(gt=0, le=1_000_000_000, allow_inf_nan=False)
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2200)


class BudgetUpdate(BudgetCreate):
    pass


class BudgetOut(BaseModel):
    id: int
    user_id: int
    category: str
    amount: float
    month: int
    year: int
    spent: float
    created_at: str
    updated_at: str


class BudgetResponse(BaseModel):
    budget: BudgetOut


class BudgetListResponse(BaseModel):
    budgets: List[BudgetOut]


class AIChatHistoryMessage(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AIChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    message: str = Field(min_length=1, max_length=1000)
    history: List[AIChatHistoryMessage] = Field(default_factory=list, max_length=10)


class AIChatResponse(BaseModel):
    reply: str
    source: Literal["deterministic", "gemini", "fallback"]
    forecast_warning: bool = False
