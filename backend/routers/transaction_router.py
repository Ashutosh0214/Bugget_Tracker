from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from database import db_connection
from schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionListResponse,
    TransactionOut,
    DeleteResponse,
    BulkTransactionCreate,
    BulkTransactionResponse,
)
from auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _transaction_from_row(row) -> TransactionOut:
    return TransactionOut(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        category=row["category"],
        amount=row["amount"],
        date=row["date"],
        status=row["status"] or "Completed",
        icon=row["icon"] or ("💸" if row["amount"] < 0 else "💰"),
        created_at=str(row["created_at"]) if row["created_at"] else "",
        source=row["source"] or "manual",
    )

@router.get("", response_model=TransactionListResponse)
def get_transactions(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    with db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
            (user_id,)
        ).fetchall()
    
    transactions = [_transaction_from_row(row) for row in rows]
    
    return {"transactions": transactions}

@router.post("", status_code=status.HTTP_201_CREATED, response_model=TransactionResponse)
def add_transaction(data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    tx_date = data.date.isoformat() if data.date else datetime.now().date().isoformat()
    tx_category = data.category
    tx_status = data.status
    
    if data.icon:
        tx_icon = data.icon
    else:
        tx_icon = "💸" if data.amount < 0 else "💰"
        
    with db_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO transactions (user_id, name, category, amount, date, status, icon)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, data.name, tx_category, data.amount, tx_date, tx_status, tx_icon)
        )
        tx_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id)
        ).fetchone()
    
    created_tx = _transaction_from_row(row)
    
    return {"transaction": created_tx}


@router.post("/bulk", status_code=status.HTTP_201_CREATED, response_model=BulkTransactionResponse)
def add_monthly_setup_transactions(
    data: BulkTransactionCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id")
    period_prefix = f"{data.year:04d}-{data.month:02d}"

    with db_connection() as conn:
        existing = conn.execute(
            """SELECT 1 FROM transactions
               WHERE user_id = ? AND source = 'monthly_setup' AND substr(date, 1, 7) = ?
               LIMIT 1""",
            (user_id, period_prefix),
        ).fetchone()
        if existing and not data.allow_duplicates:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": f"Monthly setup entries already exist for {period_prefix}."},
            )

        created_ids = []
        for item in data.transactions:
            tx_icon = item.icon or ("💸" if item.amount < 0 else "💰")
            cursor = conn.execute(
                """INSERT INTO transactions
                   (user_id, name, category, amount, date, status, icon, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'monthly_setup')""",
                (
                    user_id,
                    item.name,
                    item.category,
                    item.amount,
                    item.date.isoformat(),
                    item.status,
                    tx_icon,
                ),
            )
            created_ids.append(cursor.lastrowid)

        placeholders = ",".join("?" for _ in created_ids)
        rows = conn.execute(
            f"SELECT * FROM transactions WHERE user_id = ? AND id IN ({placeholders}) ORDER BY id",
            (user_id, *created_ids),
        ).fetchall()

    transactions = [_transaction_from_row(row) for row in rows]
    return {
        "transactions": transactions,
        "count": len(transactions),
        "message": "Monthly setup saved successfully.",
    }

@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id")
    tx_date = data.date.isoformat() if data.date else datetime.now().date().isoformat()
    tx_icon = data.icon or ("💸" if data.amount < 0 else "💰")

    with db_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM transactions WHERE id = ? AND user_id = ?",
            (tx_id, user_id),
        ).fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Transaction not found or unauthorized"},
            )

        conn.execute(
            """UPDATE transactions
               SET name = ?, category = ?, amount = ?, date = ?, status = ?, icon = ?
               WHERE id = ? AND user_id = ?""",
            (
                data.name,
                data.category,
                data.amount,
                tx_date,
                data.status,
                tx_icon,
                tx_id,
                user_id,
            ),
        )
        row = conn.execute(
            "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
            (tx_id, user_id),
        ).fetchone()

    return {
        "transaction": _transaction_from_row(row)
    }

@router.delete("/{tx_id}", response_model=DeleteResponse)
def delete_transaction(tx_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    with db_connection() as conn:
        result = conn.execute(
            "DELETE FROM transactions WHERE id = ? AND user_id = ?",
            (tx_id, user_id)
        )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Transaction not found or unauthorized"}
        )
    
    return {"message": "Transaction deleted successfully", "id": tx_id}
