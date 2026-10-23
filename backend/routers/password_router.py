import hmac
import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from auth import hash_password
from database import db_connection, revoke_user_sessions
from password_reset import (GENERIC_MESSAGE, issue_reset, mail_config, notify_password_changed,
                            rate_limit, request_rate_limit, token_hash)


router = APIRouter(prefix='/api/auth', tags=['Password recovery'])


class ForgotPassword(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    email: EmailStr = Field(max_length=254)


class ResetPassword(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    token: str = Field(pattern=r'^[A-Za-z0-9_-]{43}$')
    new_password: str = Field(min_length=12, max_length=128)
    confirm_password: str = Field(min_length=1, max_length=128)

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, value):
        if len(value.encode('utf-8')) > 72:
            raise ValueError('Password must be at most 72 UTF-8 bytes.')
        if value.casefold() in {'password1234', 'password12345', '123456789012', 'qwerty123456', 'abcdefghijkl'} or len(set(value)) < 4:
            raise ValueError('Choose a less predictable password or a longer passphrase.')
        return value

    @model_validator(mode='after')
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError('Passwords do not match.')
        return self


@router.post('/forgot-password', dependencies=[Depends(request_rate_limit)])
def forgot_password(data: ForgotPassword, tasks: BackgroundTasks):
    config = mail_config()  # Same result for all emails, even when mail isn't configured.
    allowed, _ = rate_limit('forgot:email:' + str(data.email).lower(), 3, 3600)
    if allowed:
        tasks.add_task(issue_reset, str(data.email).lower(), config)
    return JSONResponse(status_code=202, content={'message': GENERIC_MESSAGE}, headers={'Cache-Control': 'no-store'})


@router.post('/reset-password', dependencies=[Depends(request_rate_limit)])
def reset_password(data: ResetPassword, tasks: BackgroundTasks):
    hashed = token_hash(data.token)
    # Check the token before bcrypt work, then recheck inside the write transaction
    # so concurrent submissions cannot both change the password.
    with db_connection() as conn:
        valid = conn.execute('SELECT 1 FROM password_resets WHERE token_hash=? AND expires_at>?', (hashed, int(time.time()))).fetchone()
    if not valid:
        raise HTTPException(400, 'This reset link is invalid, expired, or already used. Request a new link.')
    password = hash_password(data.new_password)
    with db_connection() as conn:
        conn.execute('BEGIN IMMEDIATE')
        reset = conn.execute('''SELECT r.*,u.password,u.email FROM password_resets r
                                JOIN users u ON u.id=r.user_id WHERE r.token_hash=? AND r.expires_at>?''',
                             (hashed, int(time.time()))).fetchone()
        if (not reset or not reset['password'].startswith(('$2a$', '$2b$', '$2y$'))
                or not hmac.compare_digest(reset['password_fingerprint'], token_hash(reset['password']))):
            raise HTTPException(400, 'This reset link is invalid, expired, or already used. Request a new link.')
        conn.execute('UPDATE users SET password=? WHERE id=?', (password, reset['user_id']))
        revoke_user_sessions(conn, reset['user_id'])
    tasks.add_task(notify_password_changed, reset['email'])
    return JSONResponse({'message': 'Password updated. Please sign in with your new password.'}, headers={'Cache-Control': 'no-store'})
