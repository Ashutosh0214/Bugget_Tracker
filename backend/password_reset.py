"""Password recovery using hashed one-use tokens and backend-only Resend delivery."""
import hashlib
import hmac
import logging
import os
import secrets
import time
from dataclasses import dataclass, field
from email.utils import parseaddr
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException, Request
from pydantic import EmailStr, TypeAdapter

from config import get_settings
from database import db_connection
from oauth_service import valid_origin


logger = logging.getLogger(__name__)
GENERIC_MESSAGE = 'If this email has a password-based Spendze account, a password-reset link will be sent. If you use Google, continue signing in with Google.'
TOKEN_TTL = 15 * 60


def token_hash(value):
    return hashlib.sha256(value.encode()).hexdigest()


@dataclass(frozen=True)
class MailConfig:
    api_key: str = field(repr=False)
    sender: str
    frontend: str


def mail_config():
    key = os.getenv('RESEND_API_KEY', '').strip()
    sender = os.getenv('PASSWORD_RESET_FROM', '').strip()
    frontend = os.getenv('PASSWORD_RESET_FRONTEND_URL', '').strip().rstrip('/')
    try:
        if os.getenv('EMAIL_PROVIDER', 'resend') != 'resend' or not key:
            raise ValueError()
        if '\r' in sender or '\n' in sender:
            raise ValueError()
        TypeAdapter(EmailStr).validate_python(parseaddr(sender)[1])
        if not valid_origin(frontend):
            raise ValueError()
        if frontend not in get_settings().cors_origins:
            raise ValueError()
        if not frontend.startswith('https://') and (get_settings().is_production or urlsplit(frontend).hostname not in ('localhost', '127.0.0.1')):
            raise ValueError()
    except ValueError:
        raise HTTPException(503, 'Password recovery is temporarily unavailable. Please try again later.') from None
    return MailConfig(key, sender, frontend)


async def send_mail(config, recipient, subject, text, message_id):
    # Do not log request/response bodies: the reset link is a bearer credential.
    async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
        response = await client.post('https://api.resend.com/emails',
                                     headers={'Authorization': f'Bearer {config.api_key}',
                                              'Idempotency-Key': message_id},
                                     json={'from': config.sender, 'to': [recipient], 'subject': subject, 'text': text})
        response.raise_for_status()
        if not response.json().get('id'):
            raise RuntimeError('Email provider did not accept the message')


async def issue_reset(email, config):
    """Runs after the generic HTTP response, including for nonexistent emails."""
    raw_token = secrets.token_urlsafe(32)
    hashed = token_hash(raw_token)
    try:
        with db_connection() as conn:
            conn.execute('BEGIN IMMEDIATE')
            rows = conn.execute('SELECT id,password,email FROM users WHERE lower(email)=?', (email,)).fetchall()
            # Never bootstrap a password onto a social-only account. Ambiguous legacy
            # case-duplicate emails also fail closed without changing either account.
            if len(rows) != 1 or not rows[0]['password'].startswith(('$2a$', '$2b$', '$2y$')):
                return
            user = rows[0]
            now = int(time.time())
            conn.execute('DELETE FROM password_resets WHERE expires_at<=?', (now,))
            conn.execute('DELETE FROM password_resets WHERE user_id=?', (user['id'],))
            conn.execute('INSERT INTO password_resets VALUES (?,?,?,?)',
                         (hashed, user['id'], token_hash(user['password']), now + TOKEN_TTL))
        link = f'{config.frontend}/reset-password#token={raw_token}'
        await send_mail(config, user['email'], 'Reset your Spendze password',
                        f'Use this link within 15 minutes to reset your Spendze password:\n\n{link}\n\n'
                        'Only the newest link works, and each link can be used once. '
                        'If you did not request this, ignore this email. Your password has not changed.',
                        'password-reset-' + hashed)
    except Exception:
        # Fixed event only, no exception/URL/email/token/API-key interpolation.
        logger.error('Password reset email could not be sent; check email provider configuration and availability.')
        try:
            with db_connection() as conn:
                conn.execute('DELETE FROM password_resets WHERE token_hash=?', (hashed,))
        except Exception:
            logger.error('Password reset cleanup failed.')


async def notify_password_changed(email):
    try:
        await send_mail(mail_config(), email, 'Your Spendze password was changed',
                        'Your Spendze password was changed and existing sessions were signed out. '
                        'If this was not you, recover your account immediately and review linked sign-in accounts.',
                        'password-changed-' + secrets.token_hex(16))
    except Exception:
        logger.error('Password change notification could not be sent.')


def rate_limit(key, limit, window):
    """Atomic, persistent buckets shared by workers on the same SQLite database."""
    now = int(time.time())
    hashed = hmac.new(get_settings().jwt_secret.encode(), key.encode(), hashlib.sha256).hexdigest()
    with db_connection() as conn:
        conn.execute('DELETE FROM auth_rate_limits WHERE expires_at<=?', (now,))
        row = conn.execute('''INSERT INTO auth_rate_limits VALUES (?,1,?)
                              ON CONFLICT(bucket_hash) DO UPDATE SET count=count+1
                              RETURNING count,expires_at''', (hashed, now + window)).fetchone()
    return row['count'] <= limit, max(1, row['expires_at'] - now)


def request_rate_limit(request: Request):
    # Uvicorn must trust forwarding headers ONLY from the deployment's real proxy.
    # We never parse an arbitrary caller-supplied X-Forwarded-For here.
    ip = request.client.host if request.client else 'unknown'
    kind = 'forgot' if request.url.path.endswith('forgot-password') else 'reset'
    allowed, retry = rate_limit(f'{kind}:ip:{ip}', 5 if kind == 'forgot' else 10, 900)
    if not allowed:
        raise HTTPException(429, 'Too many attempts. Please try again later.', headers={'Retry-After': str(retry)})
