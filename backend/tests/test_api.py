from conftest import create_user


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_preflight_allows_transaction_updates(client):
    response = client.options(
        "/api/transactions/1",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "PUT" in response.headers["access-control-allow-methods"]


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


def test_transaction_update_is_persistent_and_owner_scoped(client):
    owner = create_user(client, "update-owner")
    other = create_user(client, "update-other")
    created = client.post(
        "/api/transactions",
        headers=auth_headers(owner["token"]),
        json={"name": "grocery", "category": "Groceries", "amount": -500, "date": "2026-09-05"},
    )
    assert created.status_code == 201
    transaction_id = created.json()["transaction"]["id"]
    update_payload = {
        "name": "grocery",
        "category": "Groceries",
        "amount": -700,
        "date": "2026-09-05",
        "status": "Completed",
        "icon": "💸",
    }

    forbidden_update = client.put(
        f"/api/transactions/{transaction_id}",
        headers=auth_headers(other["token"]),
        json=update_payload,
    )
    assert forbidden_update.status_code == 404

    owner_update = client.put(
        f"/api/transactions/{transaction_id}",
        headers=auth_headers(owner["token"]),
        json=update_payload,
    )
    assert owner_update.status_code == 200
    assert owner_update.json()["transaction"]["amount"] == -700

    persisted = client.get("/api/transactions", headers=auth_headers(owner["token"]))
    assert persisted.status_code == 200
    assert persisted.json()["transactions"][0]["amount"] == -700


def test_authentication_is_required(client):
    response = client.get("/api/transactions")
    assert response.status_code in (401, 403)


def test_monthly_setup_bulk_is_atomic_duplicate_safe_and_user_scoped(client):
    owner = create_user(client, "setup-owner")
    other = create_user(client, "setup-other")
    payload = {
        "month": 10,
        "year": 2026,
        "transactions": [
            {"name": "Monthly Income", "category": "Income", "amount": 50000, "date": "2026-10-01"},
            {"name": "Groceries", "category": "Groceries", "amount": -5000, "date": "2026-10-01"},
        ],
    }

    created = client.post(
        "/api/transactions/bulk", headers=auth_headers(owner["token"]), json=payload
    )
    assert created.status_code == 201
    assert created.json()["count"] == 2
    assert {item["source"] for item in created.json()["transactions"]} == {"monthly_setup"}

    duplicate = client.post(
        "/api/transactions/bulk", headers=auth_headers(owner["token"]), json=payload
    )
    assert duplicate.status_code == 409
    assert len(client.get("/api/transactions", headers=auth_headers(owner["token"])).json()["transactions"]) == 2

    allowed = client.post(
        "/api/transactions/bulk",
        headers=auth_headers(owner["token"]),
        json={**payload, "allow_duplicates": True},
    )
    assert allowed.status_code == 201
    assert len(client.get("/api/transactions", headers=auth_headers(owner["token"])).json()["transactions"]) == 4

    isolated = client.get("/api/transactions", headers=auth_headers(other["token"]))
    assert isolated.status_code == 200
    assert isolated.json()["transactions"] == []

    invalid = client.post(
        "/api/transactions/bulk",
        headers=auth_headers(other["token"]),
        json={**payload, "transactions": [payload["transactions"][0], {**payload["transactions"][1], "amount": 0}]},
    )
    assert invalid.status_code == 422
    assert client.get("/api/transactions", headers=auth_headers(other["token"])).json()["transactions"] == []


def test_monthly_setup_acceptance_totals_and_category_mapping(client):
    user = create_user(client, "setup-totals")
    amounts = [50000, -10000, -1500, -5000, -2000, -1000, -3000, -500]
    names_and_categories = [
        ("Monthly Income", "Income"),
        ("House Rent", "Bills"),
        ("Electricity Bill", "Bills"),
        ("Groceries", "Groceries"),
        ("Travel / Transport", "Transport"),
        ("Entertainment", "Entertainment"),
        ("Shopping", "Shopping"),
        ("Miscellaneous", "Miscellaneous"),
    ]
    payload = {
        "month": 11,
        "year": 2026,
        "transactions": [
            {
                "name": name,
                "category": category,
                "amount": amount,
                "date": "2026-11-01",
                "status": "Completed",
            }
            for (name, category), amount in zip(names_and_categories, amounts)
        ],
    }

    response = client.post(
        "/api/transactions/bulk", headers=auth_headers(user["token"]), json=payload
    )
    assert response.status_code == 201
    persisted = client.get(
        "/api/transactions", headers=auth_headers(user["token"])
    ).json()["transactions"]
    assert len(persisted) == 8
    assert sum(item["amount"] for item in persisted if item["amount"] > 0) == 50000
    assert -sum(item["amount"] for item in persisted if item["amount"] < 0) == 23000
    assert sum(item["amount"] for item in persisted) == 27000
    assert {(item["name"], item["category"]) for item in persisted} == set(names_and_categories)
