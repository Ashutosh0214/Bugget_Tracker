import pytest

from conftest import create_user


def test_docs_and_signup_contract(client):
    assert client.get('/docs').status_code == 200
    schema = client.get('/openapi.json').json()
    assert 'post' in schema['paths']['/api/auth/signup']


def test_signup_stores_hash_not_plaintext_and_returns_no_password(client):
    from auth import verify_password
    from database import db_connection

    result = create_user(client)
    assert set(result) == {'user', 'token', 'message'}
    assert 'password' not in result['user']
    with db_connection() as conn:
        row = conn.execute('SELECT * FROM users WHERE id = ?', (result['user']['id'],)).fetchone()
    assert row['email'] == 'one@example.com'
    assert row['password'] != 'secure-password'
    assert row['password'].startswith('$2')
    assert verify_password('secure-password', row['password'])
    login = client.post('/api/auth/login', json={'email': row['email'], 'password': 'secure-password'})
    assert login.status_code == 200
    assert 'password' not in login.json()['user']


@pytest.mark.parametrize(('changes', 'field'), [
    ({'name': '   '}, 'name'),
    ({'name': 'n' * 101}, 'name'),
    ({'email': 'not-an-email'}, 'email'),
    ({'password': '1234567'}, 'password'),
    ({'password': ' 1234567 '}, 'password'),
    ({'password': 'x' * 129}, 'password'),
    ({'password': 'x' * 73}, 'password'),
    ({'password': '\u00e9' * 37}, 'password'),
    ({'confirmPassword': 'secure-password'}, 'confirmPassword'),
])
def test_signup_validation(client, changes, field):
    payload = {'name': 'Test User', 'email': 'validation@example.com', 'password': 'secure-password'}
    response = client.post('/api/auth/signup', json={**payload, **changes})
    assert response.status_code == 422
    assert any(error['field'] == field for error in response.json()['errors'])
    assert 'secure-password' not in response.text


def test_eight_character_password_and_normalized_fields(client):
    response = client.post('/api/auth/signup', json={
        'name': ' Test User ', 'email': ' EIGHT@EXAMPLE.COM ', 'password': ' 12345678 ',
    })
    assert response.status_code == 201
    assert response.json()['user']['name'] == 'Test User'
    assert response.json()['user']['email'] == 'eight@example.com'


@pytest.mark.parametrize('password', ['x' * 72, '\u00e9' * 36])
def test_bcrypt_boundary_password_can_register_and_login(client, password):
    response = client.post('/api/auth/signup', json={
        'name': 'Boundary User', 'email': 'boundary@example.com', 'password': password,
    })
    assert response.status_code == 201
    login = client.post('/api/auth/login', json={'email': 'boundary@example.com', 'password': password})
    assert login.status_code == 200


def test_duplicate_message_and_bad_login(client):
    create_user(client)
    duplicate = client.post('/api/auth/signup', json={
        'name': 'Other', 'email': 'ONE@example.com', 'password': 'secure-password',
    })
    assert duplicate.status_code == 409
    assert duplicate.json()['message'] == 'User already exists with this email'
    response = client.post('/api/auth/login', json={'email': 'one@example.com', 'password': 'wrong-password'})
    assert response.status_code == 401


def test_cors_allows_vite_but_not_unlisted_origin(client):
    headers = {'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
               'Access-Control-Request-Headers': 'Content-Type'}
    allowed = client.options('/api/auth/signup', headers=headers)
    assert allowed.status_code == 200
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'
    denied = client.options('/api/auth/signup', headers={**headers, 'Origin': 'https://unlisted.example'})
    assert 'access-control-allow-origin' not in denied.headers
