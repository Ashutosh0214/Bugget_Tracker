"""Provider configuration and verified identities; no provider tokens are persisted."""
import base64
import hashlib
import json
import os
import ipaddress
import secrets
import sqlite3
import time
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import httpx
import jwt
from pydantic import TypeAdapter, EmailStr, ValidationError

from config import get_settings
from database import db_connection


PROVIDERS = ('google', 'github', 'apple')


class OAuthFailure(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def challenge(value):
    return base64.urlsafe_b64encode(hashlib.sha256(value.encode()).digest()).rstrip(b'=').decode()


def valid_origin(value):
    try:
        parsed = urlsplit(value)
        parsed.port  # Reject malformed ports as invalid configuration.
        return (parsed.scheme in ('http', 'https') and parsed.hostname and not parsed.username
                and not parsed.password and not parsed.query and not parsed.fragment
                and parsed.path in ('', '/') and value.rstrip('/') == f'{parsed.scheme}://{parsed.netloc}')
    except ValueError:
        return False


def frontend_origin(value):
    settings = get_settings()
    allowed = os.getenv('OAUTH_FRONTEND_ORIGINS', ','.join(settings.cors_origins)).split(',')
    if (not valid_origin(value) or value not in [v.strip().rstrip('/') for v in allowed]
            or (settings.is_production and not value.startswith('https://'))):
        raise OAuthFailure('invalid_origin')
    return value


@dataclass(frozen=True)
class Provider:
    name: str
    client_id: str
    secret: str = field(repr=False)
    backend: str = ''

    @property
    def callback(self):
        return f'{self.backend}/api/auth/oauth/{self.name}/callback'


def provider_config(name):
    if name not in PROVIDERS:
        raise OAuthFailure('unavailable')
    production = get_settings().is_production
    backend = os.getenv('OAUTH_BACKEND_URL', '' if production else 'http://127.0.0.1:8000').strip().rstrip('/')
    if (not valid_origin(backend) or (production and not backend.startswith('https://'))
            or (backend.startswith('http://') and urlsplit(backend).hostname not in ('localhost', '127.0.0.1'))):
        raise OAuthFailure('unavailable')
    client_id = os.getenv(f'{name.upper()}_CLIENT_ID', '').strip()
    if not client_id:
        raise OAuthFailure('unavailable')
    if name == 'apple':
        # Apple's web callbacks require a public HTTPS domain, not loopback.
        if not backend.startswith('https://') or urlsplit(backend).hostname in ('localhost', '127.0.0.1'):
            raise OAuthFailure('unavailable')
        try:
            ipaddress.ip_address(urlsplit(backend).hostname)
        except ValueError:
            pass
        else:
            raise OAuthFailure('unavailable')
        team, key_id = os.getenv('APPLE_TEAM_ID', '').strip(), os.getenv('APPLE_KEY_ID', '').strip()
        key = os.getenv('APPLE_PRIVATE_KEY', '').replace('\\n', '\n').strip()
        if not team or not key_id or not key:
            raise OAuthFailure('unavailable')
        try:
            now = int(time.time())
            secret = jwt.encode({'iss': team, 'iat': now, 'exp': now + 300,
                                 'aud': 'https://appleid.apple.com', 'sub': client_id},
                                key, algorithm='ES256', headers={'kid': key_id})
        except Exception:
            raise OAuthFailure('unavailable') from None
    else:
        secret = os.getenv(f'{name.upper()}_CLIENT_SECRET', '').strip()
        if not secret:
            raise OAuthFailure('unavailable')
    return Provider(name, client_id, secret, backend)


async def verify_id_token(token, provider, nonce, client):
    urls = {'google': 'https://www.googleapis.com/oauth2/v3/certs', 'apple': 'https://appleid.apple.com/auth/keys'}
    issuers = {'google': ['https://accounts.google.com', 'accounts.google.com'], 'apple': 'https://appleid.apple.com'}
    try:
        header = jwt.get_unverified_header(token)
        if header.get('alg') != 'RS256' or not isinstance(header.get('kid'), str):
            raise OAuthFailure('invalid_identity')
        response = await client.get(urls[provider.name])
        response.raise_for_status()
        keys = response.json()['keys']
        key = next(k for k in keys if k.get('kid') == header['kid'] and k.get('kty') == 'RSA'
                   and k.get('use', 'sig') == 'sig' and k.get('alg', 'RS256') == 'RS256')
        claims = jwt.decode(token, jwt.PyJWK.from_dict(key).key, algorithms=['RS256'],
                            audience=provider.client_id, issuer=issuers[provider.name],
                            options={'require': ['exp', 'iat', 'iss', 'aud', 'sub', 'nonce']})
        if not secrets.compare_digest(str(claims['nonce']), nonce):
            raise OAuthFailure('invalid_identity')
        if claims.get('azp') and claims['azp'] != provider.client_id:
            raise OAuthFailure('invalid_identity')
        if isinstance(claims['aud'], list) and len(claims['aud']) > 1 and claims.get('azp') != provider.client_id:
            raise OAuthFailure('invalid_identity')
        return claims
    except OAuthFailure:
        raise
    except Exception:
        raise OAuthFailure('invalid_identity') from None


async def fetch_identity(provider, code, verifier, nonce, apple_user=None):
    endpoints = {'google': 'https://oauth2.googleapis.com/token',
                 'github': 'https://github.com/login/oauth/access_token', 'apple': 'https://appleid.apple.com/auth/token'}
    payload = {'client_id': provider.client_id, 'client_secret': provider.secret,
               'code': code, 'redirect_uri': provider.callback, 'grant_type': 'authorization_code'}
    if provider.name != 'apple':
        payload['code_verifier'] = verifier
    async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
        response = await client.post(endpoints[provider.name], data=payload, headers={'Accept': 'application/json'})
        response.raise_for_status()
        tokens = response.json()
        if tokens.get('error'):
            raise OAuthFailure('provider_failed')
        if provider.name == 'github':
            access = tokens.get('access_token')
            if not access:
                raise OAuthFailure('invalid_identity')
            headers = {'Authorization': f'Bearer {access}', 'Accept': 'application/vnd.github+json',
                       'X-GitHub-Api-Version': '2022-11-28'}
            profile = await client.get('https://api.github.com/user', headers=headers)
            profile.raise_for_status()
            profile = profile.json()
            if type(profile.get('id')) is not int or profile['id'] <= 0:
                raise OAuthFailure('invalid_identity')
            emails = await client.get('https://api.github.com/user/emails', headers=headers)
            emails.raise_for_status()
            verified = [e for e in emails.json() if e.get('verified') is True]
            verified.sort(key=lambda e: not e.get('primary', False))
            return {'subject': str(profile['id']), 'email': verified[0]['email'] if verified else None,
                    'name': profile.get('name') or profile.get('login') or 'GitHub user'}
        claims = await verify_id_token(tokens.get('id_token', ''), provider, nonce, client)
        verified = claims.get('email_verified') in (True, 'true')
        name = claims.get('name') or ''
        if provider.name == 'apple' and apple_user:
            # Apple only supplies the name initially. Display metadata, never identity proof.
            try:
                fields = json.loads(apple_user).get('name', {})
                name = ' '.join(str(fields.get(k, '')) for k in ('firstName', 'lastName')).strip()
            except (ValueError, AttributeError, TypeError):
                pass
        return {'subject': claims['sub'], 'email': claims.get('email') if verified else None,
                'name': name or f'{provider.name.title()} user'}


def resolve_account(provider, identity, link_user_id=None, link_session_version=None):
    subject = identity.get('subject')
    if not isinstance(subject, str) or not subject or len(subject) > 255:
        raise OAuthFailure('invalid_identity')
    try:
        with db_connection() as conn:
            # Serialize creation/linking so concurrent callbacks cannot split identities.
            conn.execute('BEGIN IMMEDIATE')
            if link_user_id is not None and link_session_version is not None:
                owner = conn.execute('SELECT session_version FROM users WHERE id=?', (link_user_id,)).fetchone()
                if not owner or owner['session_version'] != link_session_version:
                    raise OAuthFailure('reauth_required')
            linked = conn.execute('SELECT user_id FROM oauth_identities WHERE provider=? AND subject=?',
                                  (provider, subject)).fetchone()
            if linked:
                if link_user_id is not None and linked['user_id'] != link_user_id:
                    raise OAuthFailure('already_linked')
                return linked['user_id'], False
            if link_user_id is not None:
                if not conn.execute('SELECT 1 FROM users WHERE id=?', (link_user_id,)).fetchone():
                    raise OAuthFailure('invalid_identity')
                user_id, created = link_user_id, False
            else:
                try:
                    email = str(TypeAdapter(EmailStr).validate_python(identity.get('email'))).lower()
                except (ValidationError, TypeError):
                    raise OAuthFailure('verified_email_required') from None
                if conn.execute('SELECT 1 FROM users WHERE lower(email)=?', (email,)).fetchone():
                    raise OAuthFailure('email_exists')
                name = str(identity.get('name') or 'Spendze user').strip()[:100] or 'Spendze user'
                # Deliberately non-bcrypt marker: social-only accounts have no usable password.
                result = conn.execute('INSERT INTO users (name,email,password) VALUES (?,?,?)',
                                      (name, email, '!oauth-only:' + secrets.token_urlsafe(32)))
                user_id, created = result.lastrowid, True
            conn.execute('INSERT INTO oauth_identities(provider,subject,user_id) VALUES(?,?,?)',
                         (provider, subject, user_id))
            return user_id, created
    except sqlite3.IntegrityError:
        raise OAuthFailure('already_linked') from None
