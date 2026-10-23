from datetime import datetime, timedelta, timezone

import jwt

from conftest import create_user


def test_signup_token_opens_own_empty_dashboard(client):
    existing = create_user(client, 'existing-data')
    old_headers = {'Authorization': f"Bearer {existing['token']}"}
    assert client.post('/api/transactions', headers=old_headers,
                       json={'name': 'Private expense', 'amount': -100}).status_code == 201
    fresh = create_user(client, 'fresh-dashboard')
    headers = {'Authorization': f"Bearer {fresh['token']}"}
    profile = client.get('/api/auth/me', headers=headers)
    assert profile.status_code == 200
    assert profile.json()['user']['id'] == fresh['user']['id']
    assert client.get('/api/transactions', headers=headers).json()['transactions'] == []
    response = client.get('/api/budgets?month=10&year=2026', headers=headers)
    assert response.status_code == 200
    assert response.json()['budgets'] == []


def test_invalid_and_expired_tokens_rejected(client):
    from config import get_settings
    user = create_user(client, 'expired-session')
    token = jwt.encode({'sub': str(user['user']['id']),
                        'exp': datetime.now(timezone.utc) - timedelta(seconds=1)},
                       get_settings().jwt_secret, algorithm='HS256')
    for value in [token, 'invalid-token']:
        headers = {'Authorization': f'Bearer {value}'}
        assert client.get('/api/auth/me', headers=headers).status_code == 401
        assert client.get('/api/transactions', headers=headers).status_code == 401
