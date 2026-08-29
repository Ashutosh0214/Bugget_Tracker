from conftest import create_user


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_signup_login_and_profile(client):
    signup = create_user(client)
    profile = client.get("/api/auth/me", headers=auth_headers(signup["token"]))
    assert profile.status_code == 200
    assert profile.json()["user"]["email"] == "one@example.com"

    login = client.post(
        "/api/auth/login",
        json={"email": "ONE@example.com", "password": "secure-password"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["id"] == signup["user"]["id"]


def test_duplicate_email_is_conflict(client):
    create_user(client)
    duplicate = client.post(
        "/api/auth/signup",
        json={"name": "Other", "email": "ONE@example.com", "password": "another-password"},
    )
    assert duplicate.status_code == 409


def test_rejects_invalid_payloads(client):
    invalid_user = client.post(
        "/api/auth/signup",
        json={"name": "User", "email": "not-an-email", "password": "short"},
    )
    assert invalid_user.status_code == 422
    assert invalid_user.json()["message"] == "Invalid request data"

    user = create_user(client)
    invalid_amount = client.post(
        "/api/transactions",
        headers=auth_headers(user["token"]),
        json={"name": "Bad", "amount": "NaN"},
    )
    assert invalid_amount.status_code == 422


def test_transactions_are_isolated_per_user(client):
    first = create_user(client, "first")
    second = create_user(client, "second")

    created = client.post(
        "/api/transactions",
        headers=auth_headers(first["token"]),
        json={"name": "Groceries", "amount": -42.5, "date": "2026-08-29"},
    )
    assert created.status_code == 201
    transaction_id = created.json()["transaction"]["id"]

    other_list = client.get("/api/transactions", headers=auth_headers(second["token"]))
    assert other_list.status_code == 200
    assert other_list.json()["transactions"] == []

    forbidden_delete = client.delete(
        f"/api/transactions/{transaction_id}", headers=auth_headers(second["token"])
    )
    assert forbidden_delete.status_code == 404

    owner_delete = client.delete(
        f"/api/transactions/{transaction_id}", headers=auth_headers(first["token"])
    )
    assert owner_delete.status_code == 200


def test_authentication_is_required(client):
    response = client.get("/api/transactions")
    assert response.status_code in (401, 403)
