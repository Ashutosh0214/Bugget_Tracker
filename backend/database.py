import sqlite3
from contextlib import contextmanager
from collections.abc import Iterator

from config import get_settings


def _create_budgets_table(cursor: sqlite3.Cursor) -> None:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL COLLATE NOCASE,
            amount REAL NOT NULL CHECK (amount > 0),
            month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
            year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2200),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (user_id, category, month, year)
        )
    """)


def _migrate_budgets_table(cursor: sqlite3.Cursor) -> None:
    columns = {row[1] for row in cursor.execute("PRAGMA table_info(budgets)").fetchall()}
    if not columns:
        _create_budgets_table(cursor)
        return
    if {"amount", "month", "year", "updated_at"}.issubset(columns):
        return

    cursor.execute("ALTER TABLE budgets RENAME TO budgets_legacy")
    _create_budgets_table(cursor)
    cursor.execute("""
        INSERT OR IGNORE INTO budgets
            (id, user_id, category, amount, month, year, created_at, updated_at)
        SELECT
            id, user_id, category, allocated_amount,
            CASE WHEN instr(month, '-') > 0 THEN CAST(substr(month, 6, 2) AS INTEGER)
                 ELSE CAST(month AS INTEGER) END,
            CASE WHEN instr(month, '-') > 0 THEN CAST(substr(month, 1, 4) AS INTEGER)
                 ELSE CAST(strftime('%Y', 'now') AS INTEGER) END,
            created_at, created_at
        FROM budgets_legacy
        WHERE allocated_amount > 0
    """)
    cursor.execute("DROP TABLE budgets_legacy")


def _migrate_transactions_table(cursor: sqlite3.Cursor) -> None:
    columns = {row[1] for row in cursor.execute("PRAGMA table_info(transactions)").fetchall()}
    if "source" not in columns:
        cursor.execute(
            "ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'"
        )

def get_db():
    conn = sqlite3.connect(get_settings().database_path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


@contextmanager
def db_connection() -> Iterator[sqlite3.Connection]:
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        columns = {row[1] for row in cursor.execute('PRAGMA table_info(users)')}
        if 'session_version' not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS password_resets (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                password_fingerprint TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS auth_rate_limits (
                bucket_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
            )
        ''')
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            status TEXT DEFAULT 'Completed',
            icon TEXT DEFAULT '💸',
            source TEXT NOT NULL DEFAULT 'manual',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        # Additive OAuth tables: existing users and financial records stay untouched.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS oauth_identities (
                provider TEXT NOT NULL,
                subject TEXT NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                PRIMARY KEY (provider, subject),
                UNIQUE (user_id, provider)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS oauth_flows (
                state_hash TEXT PRIMARY KEY, provider TEXT NOT NULL,
                browser_hash TEXT NOT NULL, verifier TEXT NOT NULL, nonce TEXT NOT NULL,
                frontend_origin TEXT NOT NULL, handoff_challenge TEXT NOT NULL,
                link_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS oauth_handoffs (
                code_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                challenge TEXT NOT NULL, frontend_origin TEXT NOT NULL,
                new_account INTEGER NOT NULL, linked INTEGER NOT NULL,
                expires_at INTEGER NOT NULL
            )
        """)
        flow_columns = {row[1] for row in cursor.execute('PRAGMA table_info(oauth_flows)')}
        if 'link_session_version' not in flow_columns:
            cursor.execute('ALTER TABLE oauth_flows ADD COLUMN link_session_version INTEGER NOT NULL DEFAULT 0')
        _migrate_transactions_table(cursor)
        _migrate_budgets_table(cursor)
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_user_date "
            "ON transactions(user_id, date DESC, id DESC)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_budgets_user_period "
            "ON budgets(user_id, year, month)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_user_source_date "
            "ON transactions(user_id, source, date)"
        )


def revoke_user_sessions(conn, user_id):
    """Called in the same transaction as a password change."""
    conn.execute('UPDATE users SET session_version=session_version+1 WHERE id=?', (user_id,))
    conn.execute('DELETE FROM password_resets WHERE user_id=?', (user_id,))
    conn.execute('DELETE FROM oauth_flows WHERE link_user_id=?', (user_id,))
    conn.execute('DELETE FROM oauth_handoffs WHERE user_id=?', (user_id,))
