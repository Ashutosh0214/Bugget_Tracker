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
        "top_category": {"name": "Shopping", "amount": 4000, "percent": 81.6},
        "budgets": [
            {"category": "Shopping", "limit": 5000, "spent": 4000, "remaining": 1000, "percent_used": 80},
            {"category": "Groceries", "limit": 500, "spent": 400, "remaining": 100, "percent_used": 80},
        ],
        "largest_expense": {"name": "Mall", "category": "Shopping", "amount": 4000, "date": "2026-09-05"},
    }


def test_follow_up_resolves_top_category_and_real_budget():
    from ai_service import deterministic_reply

    reply = deterministic_reply(
        "How much budget is left for that category?",
        conversational_context(),
        conversation_context={"last_intent": "top_spending_category", "last_category": "Shopping"},
    )
    assert "Shopping" in reply and "₹1,000" in reply and "80.0%" in reply


def test_closest_budget_then_hypothetical_spending_follow_up():
    from ai_service import deterministic_reply

    context = conversational_context()
    first = deterministic_reply("Which category is closest to its budget?", context, [])
    second = deterministic_reply(
        "What if I spend another ₹200 there?",
        context,
        conversation_context={"last_intent": "closest_budget", "last_category": "Shopping"},
    )
    assert "Shopping" in first
    assert "₹4,200" in second and "84.0%" in second and "₹800" in second


def test_contextual_question_without_history_requests_clarification():
    from ai_service import deterministic_reply

    reply = deterministic_reply("How much budget is left for that category?", conversational_context(), [])
    assert reply == "Which category are you referring to?"


def test_largest_expense_follow_up_resolves_its_category():
    from ai_service import deterministic_reply

    reply = deterministic_reply(
        "Which category was it in?",
        conversational_context(),
        conversation_context={"last_intent": "largest_expense", "last_category": "Shopping"},
    )
    assert reply == "It was in the Shopping category."


def test_exact_failed_flow_uses_structured_shopping_context():
    from ai_service import derive_conversation_context, deterministic_reply

    context = conversational_context()
    first_question = "Where did I spent the most?"
    first = deterministic_reply(first_question, context)
    first_context = derive_conversation_context(first_question, context)
    assert "Shopping" in first and "₹4,000" in first
    assert first_context == {"last_intent": "top_spending_category", "last_category": "Shopping"}

    second_question = "How much budget is left for that category?"
    second = deterministic_reply(second_question, context, conversation_context=first_context)
    second_context = derive_conversation_context(second_question, context, first_context)
    assert "Shopping" in second and "₹1,000" in second
    assert second_context["last_category"] == "Shopping"

    third = deterministic_reply(
        "What if I spend another ₹500 there?",
        context,
        conversation_context=second_context,
    )
    assert "Shopping" in third and "₹4,500" in third and "90.0%" in third and "₹500" in third


def test_explicit_category_flow_and_new_chat_context_clear():
    from ai_service import derive_conversation_context, deterministic_reply

    context = conversational_context()
    first_question = "How much Shopping budget do I have left?"
    first = deterministic_reply(first_question, context)
    structured = derive_conversation_context(first_question, context)
    assert "Shopping" in first and "₹1,000" in first
    assert structured["last_category"] == "Shopping"

    follow_up = deterministic_reply(
        "What if I spend ₹500 more there?",
        context,
        conversation_context=structured,
    )
    assert "Shopping" in follow_up and "₹4,500" in follow_up

    after_new_chat = deterministic_reply(
        "How much budget is left for that category?",
        context,
        conversation_context={},
    )
    assert after_new_chat == "Which category are you referring to?"


def test_provider_failure_does_not_affect_supported_deterministic_flow(client, monkeypatch):
    user = create_user(client, "ai-offline-context")
    headers = auth_headers(user["token"])
    add_transaction(client, headers, "Mall", "Shopping", -4000)

    async def unavailable(*args, **kwargs):
        raise RuntimeError("simulated provider outage")

    import routers.ai_router as ai_router
    monkeypatch.setattr(ai_router, "generate_gemini_reply", unavailable)
    first = client.post(
        "/api/ai/chat", headers=headers, json={"message": "Where did I spent the most?"}
    )
    assert first.status_code == 200
    assert first.json()["source"] == "deterministic"
    assert first.json()["context"]["last_category"] == "Shopping"
