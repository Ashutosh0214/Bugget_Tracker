import json
import time
from urllib.parse import parse_qs, urlsplit

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa, ec
from cryptography.hazmat.primitives import serialization

from conftest import create_user
from database import db_connection
from oauth_service import (OAuthFailure, Provider, challenge, digest, fetch_identity,
                           provider_config, resolve_account, verify_id_token)


ORIGIN = 'http://localhost:5173'
VERIFIER = 'v' * 43


def configure(monkeypatch, provider='google'):
    monkeypatch.setenv(f'{provider.upper()}_CLIENT_ID', f'{provider}-client')
    monkeypatch.setenv(f'{provider.upper()}_CLIENT_SECRET', 'test-secret')


def begin(client, provider='google', origin=ORIGIN):
    response = client.get(f'/api/auth/oauth/{provider}/start',
                          params={'frontend_origin': origin, 'challenge': challenge(VERIFIER)}, follow_redirects=False)
    assert response.status_code == 303
    return parse_qs(urlsplit(response.headers['location']).query)


def finish(client, state, provider='google', **kwargs):
    return client.get(f'/api/auth/oauth/{provider}/callback',
                      params={'state': state, 'code': 'authorization-code', **kwargs}, follow_redirects=False)


def redeem(client, response, verifier=VERIFIER, origin=ORIGIN):
    values = parse_qs(urlsplit(response.headers['location']).fragment)
    return client.post('/api/auth/oauth/exchange', headers={'Origin': origin},
                       json={'code': values['handoff'][0], 'verifier': verifier})


def identity(monkeypatch, subject='stable-subject', email='social@example.com', name='Social User'):
    async def verified(*args, **kwargs):
        return {'subject': subject, 'email': email, 'name': name}
    monkeypatch.setattr('routers.oauth_router.fetch_identity', verified)


def test_unconfigured_providers_are_honest(client):
    response = client.get('/api/auth/oauth/providers')
    assert response.json() == {p: {'enabled': False} for p in ('google', 'github', 'apple')}
    assert response.headers['cache-control'] == 'no-store'
    assert client.get('/api/auth/oauth/google/start', params={'frontend_origin': ORIGIN, 'challenge': challenge(VERIFIER)}).status_code == 400


@pytest.mark.parametrize('provider', ['google', 'github'])
def test_first_and_returning_social_user_gets_own_session(client, monkeypatch, provider):
    configure(monkeypatch, provider)
    identity(monkeypatch)
    params = begin(client, provider)
    assert params['code_challenge_method'] == ['S256']
    assert params['redirect_uri'] == [f'http://127.0.0.1:8000/api/auth/oauth/{provider}/callback']
    if provider == 'google':
        assert params['nonce'] and params['prompt'] == ['select_account']
    else:
        assert params['scope'] == ['user:email']
    response = finish(client, params['state'][0], provider)
    assert 'token=' not in response.headers['location'] and '?code=' not in response.headers['location']
    assert response.headers['referrer-policy'] == 'no-referrer'
    result = redeem(client, response)
    assert result.status_code == 200 and result.json()['new_account'] is True
    headers = {'Authorization': f"Bearer {result.json()['token']}"}
    assert client.get('/api/auth/me', headers=headers).json()['user']['email'] == 'social@example.com'
    assert client.get('/api/transactions', headers=headers).json()['transactions'] == []
    identity(monkeypatch, email=None)  # Provider subject, not a mutable email, identifies returning users.
    again = redeem(client, finish(client, begin(client, provider)['state'][0], provider))
    assert again.json()['user']['id'] == result.json()['user']['id']
    assert again.json()['new_account'] is False
    assert client.post('/api/auth/login', json={'email': 'social@example.com', 'password': 'oauth-token'}).status_code == 401
    with db_connection() as conn:
        assert conn.execute('SELECT count(*) FROM users').fetchone()[0] == 1


def test_state_cookie_provider_binding_and_replay(client, monkeypatch):
    configure(monkeypatch)
    identity(monkeypatch)
    params = begin(client)
    assert finish(client, 'wrong-state').status_code == 400
    assert finish(client, params['state'][0], 'github').status_code == 400
    cookie = client.cookies.get('spendze_oauth_google')
    client.cookies.clear()
    assert finish(client, params['state'][0]).status_code == 400
    client.cookies.set('spendze_oauth_google', cookie)
    response = finish(client, params['state'][0])
    assert response.status_code == 303
    assert finish(client, params['state'][0]).status_code == 400


def test_handoff_requires_browser_proof_origin_and_single_use(client, monkeypatch):
    configure(monkeypatch)
    identity(monkeypatch)
    response = finish(client, begin(client)['state'][0])
    assert redeem(client, response, verifier='x' * 43).status_code == 400
    assert redeem(client, response, origin='https://attacker.example').status_code == 403
    assert redeem(client, response, origin='http://127.0.0.1:5173').status_code == 400
    assert redeem(client, response).status_code == 200
    assert redeem(client, response).status_code == 400


@pytest.mark.parametrize('table', ['oauth_flows', 'oauth_handoffs'])
def test_expired_responses_fail(client, monkeypatch, table):
    configure(monkeypatch)
    identity(monkeypatch)
    params = begin(client)
    response = finish(client, params['state'][0]) if table == 'oauth_handoffs' else None
    with db_connection() as conn:
        conn.execute(f'UPDATE {table} SET expires_at=0')
    result = redeem(client, response) if response else finish(client, params['state'][0])
    assert result.status_code == 400


def test_cancel_error_and_database_failure_do_not_issue_session(client, monkeypatch):
    configure(monkeypatch)
    params = begin(client)
    response = finish(client, params['state'][0], error='access_denied')
    assert parse_qs(urlsplit(response.headers['location']).fragment) == {'error': ['cancelled']}
    async def fail(*args, **kwargs):
        raise RuntimeError('client_secret=DO-NOT-EXPOSE')
    monkeypatch.setattr('routers.oauth_router.fetch_identity', fail)
    response = finish(client, begin(client)['state'][0])
    assert response.headers['location'].endswith('#error=provider_failed')
    assert 'DO-NOT-EXPOSE' not in response.text + response.headers['location']


def test_no_email_merge_and_explicit_authenticated_link_preserves_data(client, monkeypatch):
    configure(monkeypatch)
    user = create_user(client, 'linked-existing')
    headers = {'Authorization': f"Bearer {user['token']}"}
    assert client.post('/api/transactions', headers=headers, json={'name': 'Original', 'amount': -50}).status_code == 201
    identity(monkeypatch, email='linked-existing@example.com')
    blocked = finish(client, begin(client)['state'][0])
    assert blocked.headers['location'].endswith('#error=email_exists')
    form = {'session_token': user['token'], 'frontend_origin': ORIGIN, 'challenge': challenge(VERIFIER)}
    assert client.post('/api/auth/oauth/google/link', data=form, headers={'Origin': 'https://attacker.example'}).status_code == 403
    linked = client.post('/api/auth/oauth/google/link', data=form, headers={'Origin': ORIGIN}, follow_redirects=False)
    assert linked.status_code == 303
    params = parse_qs(urlsplit(linked.headers['location']).query)
    result = redeem(client, finish(client, params['state'][0]))
    assert result.json()['linked'] is True and result.json()['user']['id'] == user['user']['id']
    assert len(client.get('/api/transactions', headers=headers).json()['transactions']) == 1
    with db_connection() as conn:
        assert conn.execute('SELECT count(*) FROM users').fetchone()[0] == 1
    assert client.post('/api/auth/login', json={'email': 'linked-existing@example.com', 'password': 'secure-password'}).status_code == 200


def test_link_cannot_take_identity_from_another_account(client):
    first, second = create_user(client, 'one-link'), create_user(client, 'two-link')
    identity = {'subject': 'same-stable-id', 'email': 'one-link@example.com', 'name': 'One'}
    assert resolve_account('google', identity, first['user']['id'])[0] == first['user']['id']
    with pytest.raises(OAuthFailure, match='already_linked'):
        resolve_account('google', identity, second['user']['id'])


@pytest.mark.parametrize('origin', ['https://attacker.example', 'http://localhost:5173/evil', 'https://localhost:5173@evil.example', '//evil.example'])
def test_no_untrusted_redirect(client, monkeypatch, origin):
    configure(monkeypatch)
    assert client.get('/api/auth/oauth/google/start', params={'frontend_origin': origin, 'challenge': challenge(VERIFIER)}, follow_redirects=False).status_code == 400


def test_production_callbacks_require_explicit_https(client, monkeypatch):
    import config
    configure(monkeypatch)
    monkeypatch.setenv('APP_ENV', 'production')
    config.get_settings.cache_clear()
    with pytest.raises(OAuthFailure):
        provider_config('google')
    monkeypatch.setenv('OAUTH_BACKEND_URL', 'https://spendze-backend.onrender.com')
    assert provider_config('google').callback == 'https://spendze-backend.onrender.com/api/auth/oauth/google/callback'
    assert client.get('/api/auth/oauth/google/start', params={'frontend_origin': ORIGIN, 'challenge': challenge(VERIFIER)}).status_code == 400


@pytest.mark.anyio
@pytest.mark.parametrize('anyio_backend', ['asyncio'])
@pytest.mark.parametrize('provider_name', ['google', 'apple'])
@pytest.mark.parametrize('change', [{}, {'aud': 'wrong'}, {'iss': 'https://evil.example'}, {'nonce': 'wrong'}, {'exp': 1}, {'azp': 'wrong'}])
async def test_real_signature_claim_and_nonce_verification(change, anyio_backend, provider_name):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
    jwk.update(kid='test-key', alg='RS256', use='sig')
    async def transport(request):
        return httpx.Response(200, json={'keys': [jwk]})
    issuer = 'https://accounts.google.com' if provider_name == 'google' else 'https://appleid.apple.com'
    claims = {'iss': issuer, 'aud': 'test-client', 'sub': 'stable',
              'nonce': 'nonce', 'iat': int(time.time()), 'exp': int(time.time()) + 300, **change}
    token = jwt.encode(claims, key, algorithm='RS256', headers={'kid': 'test-key'})
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        if change:
            with pytest.raises(OAuthFailure, match='invalid_identity'):
                await verify_id_token(token, Provider(provider_name, 'test-client', 'secret'), 'nonce', client)
        else:
            assert (await verify_id_token(token, Provider(provider_name, 'test-client', 'secret'), 'nonce', client))['sub'] == 'stable'


@pytest.mark.anyio
@pytest.mark.parametrize('anyio_backend', ['asyncio'])
@pytest.mark.parametrize('verified', [True, False])
async def test_github_private_email_and_exchange_pkce(monkeypatch, verified, anyio_backend):
    requests = []
    async def transport(request):
        requests.append(request)
        if request.url.path.endswith('access_token'):
            assert parse_qs(request.content.decode())['code_verifier'] == ['verifier']
            return httpx.Response(200, json={'access_token': 'provider-secret'})
        assert request.headers['authorization'] == 'Bearer provider-secret'
        if request.url.path == '/user':
            return httpx.Response(200, json={'id': 123, 'login': 'private-user', 'email': None})
        return httpx.Response(200, json=[{'email': 'private@example.com', 'verified': verified, 'primary': True}])
    original = httpx.AsyncClient
    monkeypatch.setattr('oauth_service.httpx.AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(transport)))
    result = await fetch_identity(Provider('github', 'client', 'secret', 'http://127.0.0.1:8000'), 'code', 'verifier', 'nonce')
    assert result['subject'] == '123'
    assert result['email'] == ('private@example.com' if verified else None)


def test_apple_https_configuration_and_first_only_name(client, monkeypatch):
    configure(monkeypatch, 'apple')
    with pytest.raises(OAuthFailure):
        provider_config('apple')
    monkeypatch.setenv('OAUTH_BACKEND_URL', 'https://spendze-backend.onrender.com')
    monkeypatch.setenv('APPLE_TEAM_ID', 'test-team')
    monkeypatch.setenv('APPLE_KEY_ID', 'test-key')
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setenv('APPLE_PRIVATE_KEY', key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                                           serialization.NoEncryption()).decode())
    assert provider_config('apple').callback.endswith('/apple/callback')
    # Stable Apple subject survives name/email omission on subsequent authorization.
    first = resolve_account('apple', {'subject': 'apple-sub', 'email': 'relay@privaterelay.appleid.com', 'name': 'First Name'})
    returning = resolve_account('apple', {'subject': 'apple-sub', 'email': None, 'name': 'Apple user'})
    assert first[0] == returning[0] and returning[1] is False
    with db_connection() as conn:
        assert conn.execute('SELECT name FROM users WHERE id=?', (first[0],)).fetchone()['name'] == 'First Name'
    from fastapi.testclient import TestClient
    identity(monkeypatch, subject='new-apple-sub', email='new@privaterelay.appleid.com', name='Relay User')
    origin = 'https://bugget-tracker.vercel.app'
    with TestClient(client.app, base_url='https://testserver') as secure_client:
        params = begin(secure_client, 'apple', origin)
        assert params['response_mode'] == ['form_post'] and params['nonce']
        response = secure_client.post('/api/auth/oauth/apple/callback', data={'state': params['state'][0], 'code': 'apple-code',
                                       'user': json.dumps({'name': {'firstName': 'Relay'}})}, follow_redirects=False)
        assert response.status_code == 303
        assert redeem(secure_client, response, origin=origin).json()['user']['email'] == 'new@privaterelay.appleid.com'


def test_link_requires_fresh_session_and_fails_closed(client, monkeypatch):
    configure(monkeypatch)
    user = create_user(client, 'stale-link')
    from config import get_settings
    stale = jwt.encode({'sub': str(user['user']['id']), 'iat': int(time.time()) - 601,
                        'exp': int(time.time()) + 300}, get_settings().jwt_secret, algorithm='HS256')
    for token in (stale, 'invalid'):
        response = client.post('/api/auth/oauth/google/link', headers={'Origin': ORIGIN},
                               data={'session_token': token, 'frontend_origin': ORIGIN, 'challenge': challenge(VERIFIER)},
                               follow_redirects=False)
        assert response.status_code == 303
        assert response.headers['location'].endswith('#error=reauth_required')
    with db_connection() as conn:
        assert conn.execute('SELECT count(*) FROM oauth_identities').fetchone()[0] == 0


@pytest.mark.anyio
@pytest.mark.parametrize('anyio_backend', ['asyncio'])
async def test_bad_signatures_and_algorithms_are_rejected(anyio_backend):
    real_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    attacker_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(real_key.public_key()))
    jwk.update(kid='key', alg='RS256')
    claims = {'iss': 'https://accounts.google.com', 'aud': 'client', 'sub': 'stable', 'nonce': 'nonce',
              'iat': int(time.time()), 'exp': int(time.time()) + 300}
    async def transport(request):
        return httpx.Response(200, json={'keys': [jwk]})
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        for token in (jwt.encode(claims, attacker_key, algorithm='RS256', headers={'kid': 'key'}),
                      jwt.encode(claims, 'bad-key', algorithm='HS256', headers={'kid': 'key'})):
            with pytest.raises(OAuthFailure, match='invalid_identity'):
                await verify_id_token(token, Provider('google', 'client', 'secret'), 'nonce', client)
