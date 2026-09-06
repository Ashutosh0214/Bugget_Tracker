from datetime import date

from conftest import create_user


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def add_transaction(client, headers, name, category, amount):
    return client.post(
        "/api/transactions",
        headers=headers,
        json={"name": name, "category": category, "amount": amount, "date": date.today().isoformat()},
    )


def test_ai_chat_requires_auth_and_valid_message(client):
    assert client.post("/api/ai/chat", json={"message": "Hello"}).status_code in (401, 403)
    user = create_user(client, "ai-validation")
    headers = auth_headers(user["token"])
    assert client.post("/api/ai/chat", headers=headers, json={"message": "   "}).status_code == 422
    assert client.post("/api/ai/chat", headers=headers, json={"message": "x" * 1001}).status_code == 422


def test_simple_question_uses_deterministic_answer(client):
    user = create_user(client, "ai-deterministic")
    headers = auth_headers(user["token"])
    assert add_transaction(client, headers, "Groceries", "Groceries", -4900).status_code == 201
    response = client.post("/api/ai/chat", headers=headers, json={"message": "How much have I spent this month?"})
    assert response.status_code == 200
    assert response.json()["source"] == "deterministic"
    assert "4,900" in response.json()["reply"]


def test_gemini_receives_only_authenticated_users_aggregated_context(client, monkeypatch):
    owner = create_user(client, "ai-owner")
    other = create_user(client, "ai-other")
    owner_headers = auth_headers(owner["token"])
    other_headers = auth_headers(other["token"])
    add_transaction(client, owner_headers, "Owner purchase", "Shopping", -1234)
    add_transaction(client, other_headers, "Other purchase", "Private", -9999)
    captured = {}

    async def fake_gemini(message, context, history=None):
        captured.update(context)
        return "Verified response"

    import routers.ai_router as ai_router
    monkeypatch.setattr(ai_router, "generate_gemini_reply", fake_gemini)
    response = client.post("/api/ai/chat", headers=owner_headers, json={"message": "What should stand out to me?"})
    assert response.status_code == 200
    assert response.json()["source"] == "gemini"
    assert captured["recorded"]["expenses"] == 1234
    assert all(item["name"] != "Private" for item in captured["category_spending"])
    assert "email" not in captured and "user_id" not in captured and "token" not in captured


def test_missing_gemini_key_returns_safe_fallback(client):
    user = create_user(client, "ai-fallback")
    response = client.post(
        "/api/ai/chat",
        headers=auth_headers(user["token"]),
        json={"message": "Explain my finances conversationally."},
    )
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"


def test_provider_output_guard_rejects_unverified_financial_values():
    from ai_service import _response_numbers_are_verified

    context = {"recorded": {"income": 50000, "expenses": 4900, "savings_rate": 90.2}}
    assert _response_numbers_are_verified("You recorded ₹50,000 and saved 90.2%.", context)
    assert not _response_numbers_are_verified("Your income is ₹1 crore.", context)
    assert not _response_numbers_are_verified("Your income is ₹99,999.", context)


def conversational_context():
    return {
        "recorded": {"income": 50000, "expenses": 4900, "net_savings": 45100, "savings_rate": 90.2},
        "category_spending": [
            {"name": "Shopping", "amount": 4000, "percent": 81.6},
            {"name": "Groceries", "amount": 400, "percent": 8.2},
        ],
        "budgets": [
            {"category": "Shopping", "limit": 5000, "spent": 4000, "remaining": 1000, "percent_used": 80},
            {"category": "Groceries", "limit": 500, "spent": 400, "remaining": 100, "percent_used": 80},
        ],
        "largest_expense": {"name": "Mall", "category": "Shopping", "amount": 4000, "date": "2026-09-05"},
    }


def test_follow_up_resolves_top_category_and_real_budget():
    from ai_service import deterministic_reply

    history = [{"role": "assistant", "content": "Shopping is your top spending category this month."}]
    reply = deterministic_reply("How much budget is left for that category?", conversational_context(), history)
    assert "Shopping" in reply and "₹1,000" in reply and "80.0%" in reply


def test_closest_budget_then_hypothetical_spending_follow_up():
    from ai_service import deterministic_reply

    context = conversational_context()
    first = deterministic_reply("Which category is closest to its budget?", context, [])
    second = deterministic_reply("What if I spend another ₹200 there?", context, [{"role": "assistant", "content": first}])
    assert "Shopping" in first
    assert "₹4,200" in second and "84.0%" in second and "₹800" in second


def test_contextual_question_without_history_requests_clarification():
    from ai_service import deterministic_reply

    reply = deterministic_reply("How much budget is left for that category?", conversational_context(), [])
    assert reply == "Which category are you referring to?"


def test_largest_expense_follow_up_resolves_its_category():
    from ai_service import deterministic_reply

    history = [{"role": "assistant", "content": "Your largest expense was Mall in Shopping for ₹4,000."}]
    reply = deterministic_reply("Which category was it in?", conversational_context(), history)
    assert reply == "It was in the Shopping category."
