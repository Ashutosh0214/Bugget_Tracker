import json
import re
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import jwt
import pytest

from auth import verify_password
from config import get_settings
from conftest import create_user
from database import db_connection
from oauth_service import resolve_account, OAuthFailure
from password_reset import token_hash, send_mail as real_send_mail


NEW_PASSWORD = 'a unique reset passphrase 2026'


@pytest.fixture
def mailbox(client, monkeypatch):
    monkeypatch.setenv('RESEND_API_KEY', 'mock-only-key')
    monkeypatch.setenv('PASSWORD_RESET_FROM', 'Spendze <security@example.com>')
    messages = []
    async def send(config, recipient, subject, text, message_id):
        messages.append({'recipient': recipient, 'subject': subject, 'text': text, 'id': message_id})
    monkeypatch.setattr('password_reset.send_mail', send)
    return messages


def request_token(client, mailbox, email='one@example.com'):
    response = client.post('/api/auth/forgot-password', json={'email': email})
    assert response.status_code == 202
    return re.search(r'#token=([\w-]+)', mailbox[-1]['text']).group(1)


def reset(client, token, password=NEW_PASSWORD, confirmation=None):
    return client.post('/api/auth/reset-password', json={'token': token, 'new_password': password,
                                                       'confirm_password': password if confirmation is None else confirmation})


def test_success_hash_only_expiry_revokes_sessions_and_preserves_data(client, mailbox):
    user, other = create_user(client), create_user(client, 'unaffected')
    headers = {'Authorization': f"Bearer {user['token']}"}
    assert client.post('/api/transactions', headers=headers, json={'name': 'Keep', 'amount': -99}).status_code == 201
    assert client.post('/api/budgets', headers=headers, json={'category': 'Food', 'amount': 500, 'month': 10, 'year': 2026}).status_code == 201
    resolve_account('google', {'subject': 'linked-subject'}, user['user']['id'])
    token = request_token(client, mailbox)
    with db_connection() as conn:
        stored = conn.execute('SELECT * FROM password_resets').fetchone()
        assert stored['token_hash'] == token_hash(token) and stored['token_hash'] != token
        assert 895 <= stored['expires_at'] - int(time.time()) <= 900
        assert token not in '\n'.join(conn.iterdump())
        before = tuple(conn.execute('SELECT id,name,email,created_at FROM users WHERE id=?', (user['user']['id'],)).fetchone())
    assert reset(client, token).status_code == 200
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    assert client.get('/api/transactions', headers=headers).status_code == 401
    assert client.get('/api/auth/me', headers={'Authorization': f"Bearer {other['token']}"}).status_code == 200
    assert client.post('/api/auth/login', json={'email': 'one@example.com', 'password': 'secure-password'}).status_code == 401
    login = client.post('/api/auth/login', json={'email': 'one@example.com', 'password': NEW_PASSWORD})
    assert login.status_code == 200
    assert client.get('/api/auth/me', headers={'Authorization': f"Bearer {login.json()['token']}"}).status_code == 200
    with db_connection() as conn:
        row = conn.execute('SELECT * FROM users WHERE id=?', (user['user']['id'],)).fetchone()
        assert verify_password(NEW_PASSWORD, row['password']) and row['password'] != NEW_PASSWORD
        assert tuple(row[k] for k in ('id', 'name', 'email', 'created_at')) == before
        assert conn.execute('SELECT count(*) FROM transactions').fetchone()[0] == 1
        assert conn.execute('SELECT count(*) FROM budgets').fetchone()[0] == 1
        assert conn.execute('SELECT user_id FROM oauth_identities').fetchone()[0] == user['user']['id']
        assert conn.execute('SELECT count(*) FROM password_resets').fetchone()[0] == 0
    assert mailbox[-1]['subject'] == 'Your Spendze password was changed'
    assert token not in mailbox[-1]['text']


def test_generic_responses_unknown_and_google_only_accounts(client, mailbox):
    create_user(client)
    google_id, _ = resolve_account('google', {'subject': 'google-only', 'email': 'google@example.com', 'name': 'Google User'})
    responses = [client.post('/api/auth/forgot-password', json={'email': email})
                 for email in ('one@example.com', 'unknown@example.com', 'google@example.com')]
    assert all(r.status_code == 202 and r.json() == responses[0].json() for r in responses)
    assert len(mailbox) == 1
    with db_connection() as conn:
        assert conn.execute('SELECT password FROM users WHERE id=?', (google_id,)).fetchone()[0].startswith('!oauth-only:')
        assert conn.execute('SELECT count(*) FROM password_resets WHERE user_id=?', (google_id,)).fetchone()[0] == 0


def test_reused_expired_invalid_and_replaced_tokens(client, mailbox):
    create_user(client)
    old = request_token(client, mailbox)
    new = request_token(client, mailbox)
    assert reset(client, old).status_code == 400
    assert reset(client, 'x' * 43).status_code == 400
    with db_connection() as conn:
        conn.execute('UPDATE password_resets SET expires_at=?', (int(time.time()),))
    assert reset(client, new).status_code == 400
    latest = request_token(client, mailbox)
    assert reset(client, latest).status_code == 200
    assert reset(client, latest).status_code == 400


@pytest.mark.parametrize('password,confirmation', [('short', 'short'), ('password1234', 'password1234'),
                                                  ('a' * 20, 'a' * 20), ('é' * 37, 'é' * 37),
                                                  (NEW_PASSWORD, 'different confirmation')])
def test_weak_mismatch_and_byte_limit_do_not_consume_token(client, mailbox, password, confirmation):
    create_user(client)
    token = request_token(client, mailbox)
    response = reset(client, token, password, confirmation)
    assert response.status_code == 422
    assert token not in response.text and password not in response.text
    assert reset(client, token).status_code == 200


def test_forgot_ip_rate_limit_and_spoofed_forwarded_header(client, mailbox):
    for index in range(5):
        assert client.post('/api/auth/forgot-password', json={'email': f'unknown{index}@example.com'},
                           headers={'X-Forwarded-For': f'192.0.2.{index}'}).status_code == 202
    response = client.post('/api/auth/forgot-password', json={'email': 'another@example.com'})
    assert response.status_code == 429 and int(response.headers['retry-after']) > 0
    assert not mailbox


def test_per_account_throttle_is_generic_and_reset_attempt_limit(client, mailbox):
    create_user(client)
    for _ in range(4):
        assert client.post('/api/auth/forgot-password', json={'email': 'one@example.com'}).status_code == 202
    assert len(mailbox) == 3
    for _ in range(10):
        assert reset(client, 'x' * 43).status_code == 400
    response = reset(client, 'x' * 43)
    assert response.status_code == 429 and 'retry-after' in response.headers


def test_invalid_request_and_unconfigured_service(client):
    assert client.post('/api/auth/forgot-password', json={'email': 'invalid'}).status_code == 422
    assert client.post('/api/auth/forgot-password', json={'email': 'unknown@example.com'}).status_code == 503
    assert client.post('/api/auth/forgot-password', json={'email': 'unknown@example.com', 'redirect': 'https://evil.example'}).status_code == 422
    assert reset(client, 'invalid-token').status_code == 422


def test_mail_failure_does_not_expose_secrets_and_removes_token(client, mailbox, monkeypatch, caplog):
    create_user(client)
    async def fail(*args):
        raise RuntimeError('SECRET-TOKEN-DO-NOT-LOG')
    monkeypatch.setattr('password_reset.send_mail', fail)
    response = client.post('/api/auth/forgot-password', json={'email': 'one@example.com'})
    assert response.status_code == 202
    assert 'SECRET-TOKEN' not in caplog.text + response.text
    with db_connection() as conn:
        assert conn.execute('SELECT count(*) FROM password_resets').fetchone()[0] == 0


def test_concurrent_use_only_changes_password_once(client, mailbox):
    create_user(client)
    token = request_token(client, mailbox)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: reset(client, token).status_code, range(2)))
    assert sorted(results) == [200, 400]


def test_old_link_flow_and_legacy_jwt_revoked(client, mailbox):
    user = create_user(client)
    legacy = jwt.encode({'sub': str(user['user']['id']), 'iat': int(time.time()), 'exp': int(time.time()) + 300},
                        get_settings().jwt_secret, algorithm='HS256')
    assert client.get('/api/auth/me', headers={'Authorization': f'Bearer {legacy}'}).status_code == 200
    token = request_token(client, mailbox)
    assert reset(client, token).status_code == 200
    assert client.get('/api/auth/me', headers={'Authorization': f'Bearer {legacy}'}).status_code == 401
    with pytest.raises(OAuthFailure, match='reauth_required'):
        resolve_account('google', {'subject': 'attacker-subject'}, user['user']['id'], link_session_version=0)


def test_host_header_does_not_control_reset_link(client, mailbox):
    create_user(client)
    response = client.post('/api/auth/forgot-password', json={'email': 'one@example.com'}, headers={'Host': 'evil.example'})
    assert response.status_code == 202
    assert 'http://localhost:5173/reset-password#token=' in mailbox[0]['text']
    assert 'evil.example' not in mailbox[0]['text']


def test_password_update_and_token_consumption_rollback_together(client, mailbox, monkeypatch):
    create_user(client)
    token = request_token(client, mailbox)
    def unavailable(*args):
        raise RuntimeError('Simulated database failure')
    monkeypatch.setattr('routers.password_router.revoke_user_sessions', unavailable)
    from fastapi.testclient import TestClient
    with TestClient(client.app, raise_server_exceptions=False) as safe_client:
        assert reset(safe_client, token).status_code == 500
    with db_connection() as conn:
        assert verify_password('secure-password', conn.execute('SELECT password FROM users').fetchone()[0])
        assert conn.execute('SELECT token_hash FROM password_resets').fetchone()[0] == token_hash(token)
    assert len(mailbox) == 1  # No success notification on a rolled-back reset.


def test_production_reset_email_requires_trusted_https_frontend(client, mailbox, monkeypatch):
    import config
    monkeypatch.setenv('APP_ENV', 'production')
    config.get_settings.cache_clear()
    assert client.post('/api/auth/forgot-password', json={'email': 'unknown@example.com'}).status_code == 503
    monkeypatch.setenv('PASSWORD_RESET_FRONTEND_URL', 'https://attacker.example')
    assert client.post('/api/auth/forgot-password', json={'email': 'unknown@example.com'}).status_code == 503


@pytest.mark.anyio
@pytest.mark.parametrize('anyio_backend', ['asyncio'])
async def test_resend_http_contract_without_real_email(client, mailbox, monkeypatch, anyio_backend):
    from password_reset import mail_config
    async def transport(request):
        assert str(request.url) == 'https://api.resend.com/emails'
        assert request.headers['authorization'] == 'Bearer mock-only-key'
        assert request.headers['idempotency-key'] == 'unique-message-id'
        data = json.loads(request.content)
        assert data['to'] == ['recipient@example.com'] and data['text'] == 'Test body'
        return httpx.Response(200, json={'id': 'mock-provider-id'})
    original = httpx.AsyncClient
    monkeypatch.setattr('password_reset.httpx.AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(transport)))
    await real_send_mail(mail_config(), 'recipient@example.com', 'Test', 'Test body', 'unique-message-id')
