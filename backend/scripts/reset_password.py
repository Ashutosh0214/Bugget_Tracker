"""Administrative CLI for resetting one existing Spendze user's password."""

from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

from pydantic import ValidationError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from auth import hash_password  # noqa: E402
<<<<<<< HEAD
from database import db_connection, revoke_user_sessions  # noqa: E402
=======
from database import db_connection  # noqa: E402
>>>>>>> 5a27e51bcd8e7c7ae2d3706660cc9bb2f664fcb3
from schemas import UserSignup  # noqa: E402


def _validated_password(password: str, user: dict) -> str | None:
    try:
        # Reuse the registration schema so reset passwords follow exactly the
        # same length, whitespace, and bcrypt byte-length rules as sign-up.
        validated = UserSignup(
            name=user["name"],
            email=user["email"],
            password=password,
        )
    except ValidationError as exc:
        messages = "; ".join(
            error["msg"]
            for error in exc.errors(include_url=False, include_input=False)
            if error.get("loc") == ("password",)
        )
        print(f"Password validation failed: {messages or 'Invalid password.'}")
        return None
    return validated.password


def reset_password(email: str) -> int:
    email_clean = email.strip().lower()

    try:
        with db_connection() as conn:
            rows = conn.execute(
                "SELECT id, name, email FROM users WHERE email = ? COLLATE NOCASE",
                (email_clean,),
            ).fetchall()
    except Exception:
        print("Password reset failed.", file=sys.stderr)
        return 1

    if not rows:
        print("No user found for that email.")
        return 1
    if len(rows) != 1:
        print("Multiple users found for that email. Password was not reset.")
        return 1

    user = dict(rows[0])
    new_password = getpass.getpass("New password: ")
    confirmation = getpass.getpass("Confirm new password: ")
    if new_password != confirmation:
        print("Passwords do not match. Password was not reset.")
        return 1

    validated_password = _validated_password(new_password, user)
    if validated_password is None:
        return 1

    password_hash = hash_password(validated_password)
    try:
        with db_connection() as conn:
            cursor = conn.execute(
                "UPDATE users SET password = ? WHERE id = ? AND email = ?",
                (password_hash, user["id"], user["email"]),
            )
            if cursor.rowcount != 1:
                raise RuntimeError("User changed while resetting password")
<<<<<<< HEAD
            revoke_user_sessions(conn, user['id'])
=======
>>>>>>> 5a27e51bcd8e7c7ae2d3706660cc9bb2f664fcb3
    except Exception:
        print("Password reset failed.", file=sys.stderr)
        return 1

    print(f"Password reset successfully for {user['email']}.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Reset the password for one existing Spendze user.",
    )
    parser.add_argument("--email", required=True, help="Email address of the existing user")
    args = parser.parse_args(argv)

    try:
        return reset_password(args.email)
    except (EOFError, KeyboardInterrupt):
        print("\nPassword reset cancelled.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
