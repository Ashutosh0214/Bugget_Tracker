from auth import verify_password
from database import db_connection
from scripts import reset_password

from conftest import create_user


def _password_prompts(monkeypatch, *values):
    answers = iter(values)
    monkeypatch.setattr(reset_password.getpass, "getpass", lambda _prompt: next(answers))


def test_reset_password_changes_only_password(client, monkeypatch, capsys):
    auth = create_user(client)
    user_id = auth["user"]["id"]

    with db_connection() as conn:
        conn.execute(
            """
            INSERT INTO transactions (user_id, name, category, amount, date)
            VALUES (?, 'Grocery', 'Groceries', -500, '2026-09-20')
            """,
            (user_id,),
        )
        conn.execute(
            """
            INSERT INTO budgets (user_id, category, amount, month, year)
            VALUES (?, 'Groceries', 5000, 9, 2026)
            """,
            (user_id,),
        )
        before = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    _password_prompts(monkeypatch, "new-secure-password", "new-secure-password")
    result = reset_password.main(["--email", " ONE@EXAMPLE.COM "])

    assert result == 0
    output = capsys.readouterr()
    assert output.out == "Password reset successfully for one@example.com.\n"
    assert "new-secure-password" not in output.out + output.err

    with db_connection() as conn:
        after = conn.execute(
            "SELECT id, name, email, password, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        transaction_count = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        budget_count = conn.execute(
            "SELECT COUNT(*) FROM budgets WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

    assert tuple(after[key] for key in ("id", "name", "email", "created_at")) == tuple(before)
    assert not verify_password("secure-password", after["password"])
    assert verify_password("new-secure-password", after["password"])
    assert transaction_count == 1
    assert budget_count == 1


def test_reset_password_rejects_mismatched_confirmation(client, monkeypatch, capsys):
    auth = create_user(client)
    user_id = auth["user"]["id"]
    _password_prompts(monkeypatch, "new-secure-password", "different-password")

    assert reset_password.main(["--email", "one@example.com"]) == 1
    assert capsys.readouterr().out == "Passwords do not match. Password was not reset.\n"

    with db_connection() as conn:
        password_hash = conn.execute(
            "SELECT password FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()[0]
    assert verify_password("secure-password", password_hash)


def test_reset_password_does_not_create_missing_user(client, monkeypatch, capsys):
    def unexpected_prompt(_prompt):
        raise AssertionError("Password prompt should not be shown for a missing user")

    monkeypatch.setattr(reset_password.getpass, "getpass", unexpected_prompt)

    assert reset_password.main(["--email", "missing@example.com"]) == 1
    output = capsys.readouterr()
    assert output.out == "No user found for that email.\n"
    assert output.err == ""
