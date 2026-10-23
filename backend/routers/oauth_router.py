import re
import secrets
import time
from urllib.parse import urlencode, parse_qs

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, Field

from auth import generate_token, get_current_user
from config import get_settings
from database import db_connection
from oauth_service import (PROVIDERS, OAuthFailure, challenge, digest, fetch_identity,
                           frontend_origin, provider_config, resolve_account)


router = APIRouter(prefix='/api/auth/oauth', tags=['Social authentication'])
COOKIE_PATH = '/api/auth/oauth'


class StartLink(BaseModel):
    model_config = ConfigDict(extra='forbid')
    frontend_origin: str = Field(max_length=300)
    challenge: str = Field(pattern=r'^[A-Za-z0-9_-]{43}$')


class Handoff(BaseModel):
    model_config = ConfigDict(extra='forbid')
    code: str = Field(min_length=40, max_length=100)
    verifier: str = Field(pattern=r'^[A-Za-z0-9_-]{43,128}$')


def cookie_name(provider):
    return f'spendze_oauth_{provider}'


def no_store(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    return response


@router.get('/providers')
def providers():
    result = {}
    for name in PROVIDERS:
        try:
            provider_config(name)
            result[name] = {'enabled': True}
        except OAuthFailure:
            result[name] = {'enabled': False}
    return no_store(JSONResponse(result))


def begin(provider, origin, handoff_challenge, link_user_id=None, link_session_version=0):
    try:
        config = provider_config(provider)
        origin = frontend_origin(origin)
        if provider == 'apple' and not origin.startswith('https://'):
            raise OAuthFailure('unavailable')
        if not re.fullmatch(r'[A-Za-z0-9_-]{43}', handoff_challenge):
            raise OAuthFailure('invalid_request')
    except OAuthFailure as exc:
        raise HTTPException(400, f'Social authentication unavailable or invalid configuration ({exc.code}).') from None
    state, browser = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    verifier, nonce = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
    now = int(time.time())
    with db_connection() as conn:
        conn.execute('DELETE FROM oauth_flows WHERE expires_at < ?', (now,))
        conn.execute('DELETE FROM oauth_handoffs WHERE expires_at < ?', (now,))
        conn.execute('INSERT INTO oauth_flows (state_hash,provider,browser_hash,verifier,nonce,frontend_origin,handoff_challenge,link_user_id,expires_at,link_session_version) VALUES (?,?,?,?,?,?,?,?,?,?)',
                     (digest(state), provider, digest(browser), verifier, nonce, origin,
                      handoff_challenge, link_user_id, now + 600, link_session_version))
    params = {'client_id': config.client_id, 'redirect_uri': config.callback, 'response_type': 'code', 'state': state}
    if provider == 'google':
        endpoint = 'https://accounts.google.com/o/oauth2/v2/auth'
        params.update(scope='openid email profile', nonce=nonce, prompt='select_account',
                      code_challenge=challenge(verifier), code_challenge_method='S256')
    elif provider == 'github':
        endpoint = 'https://github.com/login/oauth/authorize'
        params.update(scope='user:email', code_challenge=challenge(verifier), code_challenge_method='S256')
    else:
        endpoint = 'https://appleid.apple.com/auth/authorize'
        params.update(scope='name email', nonce=nonce, response_mode='form_post')
    response = RedirectResponse(endpoint + '?' + urlencode(params), status_code=303)
    response.set_cookie(cookie_name(provider), browser, max_age=600, httponly=True,
                        secure=config.backend.startswith('https://'), path=COOKIE_PATH,
                        samesite='none' if provider == 'apple' else 'lax')
    return no_store(response)


@router.get('/{provider}/start')
def start(provider: str, frontend_origin: str, challenge: str):
    return begin(provider, frontend_origin, challenge)


async def form_fields(request):
    if request.headers.get('content-type', '').split(';')[0] != 'application/x-www-form-urlencoded':
        raise HTTPException(400, 'Invalid form format')
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 16384:
            raise HTTPException(400, 'Invalid form size')
    try:
        values = parse_qs(body.decode('utf-8'), max_num_fields=12)
    except (ValueError, UnicodeError):
        raise HTTPException(400, 'Invalid form') from None
    if any(len(v) != 1 for v in values.values()):
        raise HTTPException(400, 'Duplicate form fields')
    return {k: v[0] for k, v in values.items()}


@router.post('/{provider}/link')
async def start_link(provider: str, request: Request):
    # Top-level form navigation sets the binding cookie even when third-party
    # fetch cookies are blocked between Vercel and Render. JWT stays in POST body.
    fields = await form_fields(request)
    token = fields.pop('session_token', '')
    try:
        data = StartLink.model_validate(fields)
    except ValueError:
        raise HTTPException(400, 'Invalid linking request') from None
    # Linking requires an explicit action in a recently authenticated Spendze session.
    if request.headers.get('origin') != data.frontend_origin:
        raise HTTPException(403, 'Invalid linking origin')
    try:
        frontend_origin(data.frontend_origin)
    except OAuthFailure:
        raise HTTPException(403, 'Invalid linking origin') from None
    def reauthenticate():
        return no_store(RedirectResponse(data.frontend_origin + '/auth/callback#error=reauth_required', status_code=303))
    try:
        user = get_current_user(HTTPAuthorizationCredentials(scheme='Bearer', credentials=token))
    except HTTPException:
        return reauthenticate()
    if int(time.time()) - int(user.get('iat', 0)) > 600:
        return reauthenticate()
    return begin(provider, data.frontend_origin, data.challenge, user['id'], user.get('sv', 0))


def finish_redirect(flow, provider, fragment):
    response = RedirectResponse(flow['frontend_origin'] + '/auth/callback#' + urlencode(fragment), status_code=303)
    response.delete_cookie(cookie_name(provider), path=COOKIE_PATH,
                           secure=provider == 'apple' or get_settings().is_production,
                           httponly=True, samesite='none' if provider == 'apple' else 'lax')
    return no_store(response)


@router.get('/{provider}/callback', name='oauth_callback_get')
@router.post('/{provider}/callback', name='oauth_callback_post')
async def callback(provider: str, request: Request):
    if provider not in PROVIDERS:
        raise HTTPException(404, 'Unknown authentication provider')
    if request.method == 'POST':
        if provider != 'apple':
            raise HTTPException(400, 'Invalid callback format')
        params = await form_fields(request)
    else:
        try:
            values = parse_qs(request.url.query, max_num_fields=12)
        except ValueError:
            raise HTTPException(400, 'Invalid callback') from None
        if any(len(v) != 1 for v in values.values()):
            raise HTTPException(400, 'Duplicate callback fields')
        params = {k: v[0] for k, v in values.items()}
    state, browser = params.get('state', ''), request.cookies.get(cookie_name(provider), '')
    if not state or len(state) > 100 or not browser or len(browser) > 100:
        raise HTTPException(400, 'Authentication session expired or invalid. Please start again.')
    # Atomic consumption before any provider I/O prevents replay and concurrent redemption.
    with db_connection() as conn:
        flow = conn.execute('DELETE FROM oauth_flows WHERE state_hash=? AND provider=? AND browser_hash=? AND expires_at>=? RETURNING *',
                            (digest(state), provider, digest(browser), int(time.time()))).fetchone()
    if not flow:
        raise HTTPException(400, 'Authentication session expired or invalid. Please start again.')
    if params.get('error'):
        return finish_redirect(flow, provider, {'error': 'cancelled' if params['error'] == 'access_denied' else 'provider_failed'})
    code = params.get('code', '')
    if not code or len(code) > 4096:
        return finish_redirect(flow, provider, {'error': 'invalid_response'})
    try:
        config = provider_config(provider)
        identity = await fetch_identity(config, code, flow['verifier'], flow['nonce'], params.get('user'))
        user_id, created = resolve_account(provider, identity, flow['link_user_id'], flow['link_session_version'])
        handoff = secrets.token_urlsafe(32)
        with db_connection() as conn:
            conn.execute('INSERT INTO oauth_handoffs VALUES (?,?,?,?,?,?,?)',
                         (digest(handoff), user_id, flow['handoff_challenge'], flow['frontend_origin'],
                          int(created), int(flow['link_user_id'] is not None), int(time.time()) + 60))
        return finish_redirect(flow, provider, {'handoff': handoff})
    except OAuthFailure as exc:
        return finish_redirect(flow, provider, {'error': exc.code})
    except Exception:
        # Provider errors may contain secrets or upstream response bodies. Never echo them.
        return finish_redirect(flow, provider, {'error': 'provider_failed'})


@router.post('/exchange')
def exchange(data: Handoff, request: Request):
    origin = request.headers.get('origin', '')
    try:
        frontend_origin(origin)
    except OAuthFailure:
        raise HTTPException(403, 'Invalid authentication origin') from None
    with db_connection() as conn:
        row = conn.execute('DELETE FROM oauth_handoffs WHERE code_hash=? AND challenge=? AND frontend_origin=? AND expires_at>=? RETURNING *',
                           (digest(data.code), challenge(data.verifier), origin, int(time.time()))).fetchone()
        if not row:
            raise HTTPException(400, 'Sign-in expired or already completed. Please start again.')
        user = conn.execute('SELECT id,name,email FROM users WHERE id=?', (row['user_id'],)).fetchone()
        if not user:
            raise HTTPException(400, 'Account unavailable. Please start again.')
        token = generate_token(user['id'], user['email'], user['name'])
    return no_store(JSONResponse({'token': token, 'user': dict(user), 'new_account': bool(row['new_account']),
                                  'linked': bool(row['linked']), 'message': 'Signed in successfully'}))
