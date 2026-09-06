from conftest import create_user


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_budget_crud_usage_duplicates_and_ownership(client):
    owner = create_user(client, "budget-owner")
    other = create_user(client, "budget-other")
    owner_headers = auth_headers(owner["token"])
    other_headers = auth_headers(other["token"])

    for name, category, amount in [
        ("Grocery", "Groceries", -500),
        ("More grocery", "groceries", -1000),
        ("Entertainment", "Entertainment", -1000),
        ("Income", "Groceries", 50000),
        ("Old grocery", "Groceries", -900),
    ]:
        date = "2026-08-05" if name == "Old grocery" else "2026-09-05"
        response = client.post(
            "/api/transactions",
            headers=owner_headers,
            json={"name": name, "category": category, "amount": amount, "date": date},
        )
        assert response.status_code == 201

    created = client.post(
        "/api/budgets",
        headers=owner_headers,
        json={"category": "Groceries", "amount": 5000, "month": 9, "year": 2026},
    )
    assert created.status_code == 201
    budget = created.json()["budget"]
    assert budget["spent"] == 1500

    duplicate = client.post(
        "/api/budgets",
        headers=owner_headers,
        json={"category": "groceries", "amount": 6000, "month": 9, "year": 2026},
    )
    assert duplicate.status_code == 409

    assert client.get("/api/budgets?month=9&year=2026", headers=other_headers).json()["budgets"] == []
    forbidden_update = client.put(
        f"/api/budgets/{budget['id']}",
        headers=other_headers,
        json={"category": "Groceries", "amount": 2000, "month": 9, "year": 2026},
    )
    assert forbidden_update.status_code == 404
    assert client.delete(f"/api/budgets/{budget['id']}", headers=other_headers).status_code == 404

    updated = client.put(
        f"/api/budgets/{budget['id']}",
        headers=owner_headers,
        json={"category": "Groceries", "amount": 2000, "month": 9, "year": 2026},
    )
    assert updated.status_code == 200
    assert updated.json()["budget"]["amount"] == 2000
    assert updated.json()["budget"]["spent"] == 1500

    deleted = client.delete(f"/api/budgets/{budget['id']}", headers=owner_headers)
    assert deleted.status_code == 200
    assert client.get("/api/budgets?month=9&year=2026", headers=owner_headers).json()["budgets"] == []
    transactions = client.get("/api/transactions", headers=owner_headers).json()["transactions"]
    assert len(transactions) == 5


def test_budget_validation_and_authentication(client):
    user = create_user(client, "budget-validation")
    invalid = client.post(
        "/api/budgets",
        headers=auth_headers(user["token"]),
        json={"category": "Groceries", "amount": 0, "month": 13, "year": 2026},
    )
    assert invalid.status_code == 422
    assert client.get("/api/budgets").status_code in (401, 403)
